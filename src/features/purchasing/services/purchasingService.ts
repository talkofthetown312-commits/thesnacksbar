import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Supplier, PurchaseOrder } from '../models/purchasing';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB } from '../../../core/offline/db';
import { inventoryService } from '../../inventory/services/inventoryService';
import { financeService } from '../../finance/services/financeService';

class PurchasingService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getSuppliers(): Promise<Supplier[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Supplier>('suppliers');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'suppliers')));
        if (!snapshot.empty) {
          const merged = new Map<string, Supplier>();
          for (const s of local) merged.set(s.id, s);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Supplier);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('suppliers', list);
          return list;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<PurchaseOrder>('purchase_orders');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'purchase_orders')));
        if (!snapshot.empty) {
          const merged = new Map<string, PurchaseOrder>();
          for (const p of local) merged.set(p.id, p);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as PurchaseOrder);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('purchase_orders', list);
          return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      } catch {
        // Offline fallback
      }
    }
    return local.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>): Promise<PurchaseOrder> {
    await this.ensureInitialized();
    const newPO: PurchaseOrder = {
      ...po,
      id: `po_${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString()
    };
    await offlineDB.setDoc('purchase_orders', newPO.id, newPO);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'purchase_orders', newPO.id), newPO);
      } catch {
        // Queued via offlineDB
      }
    }
    return newPO;
  }

  async updatePurchaseOrderStatus(poId: string, status: PurchaseOrder['status']): Promise<void> {
    await this.ensureInitialized();
    const existing = await offlineDB.getDoc<PurchaseOrder>('purchase_orders', poId);

    // When a PO is marked FULFILLED (Goods Received), automatically record STOCK_IN for each item and post to Finance ledger
    if (status === 'FULFILLED' && existing && existing.status !== 'FULFILLED') {
      const updatedItems = existing.items.map(item => ({
        ...item,
        receivedQuantity: item.quantity
      }));

      for (const [idx, item] of updatedItems.entries()) {
        if (item.productId && item.quantity > 0) {
          await inventoryService.recordTransaction({
            idempotencyKey: `po_grn_${poId}_${idx}`,
            itemId: item.productId,
            type: 'STOCK_IN',
            quantity: item.quantity,
            referenceId: existing.poNumber,
            notes: `PO Received (${existing.poNumber}) from ${existing.supplierName}`,
            unitCost: item.unitPrice || 0,
            totalCost: item.totalPrice || item.quantity * (item.unitPrice || 0),
            performedBy: 'Purchasing GRN'
          });
        }
      }

      await financeService.createTransaction({
        id: `ftxn_po_${poId}`,
        date: new Date().toISOString(),
        reference: existing.poNumber,
        description: `Purchase Order Received (${existing.poNumber}) — ${existing.supplierName}`,
        status: 'POSTED',
        lines: [
          {
            id: `ln_${poId}_1`,
            accountId: 'acc_inventory',
            accountName: 'Kitchen & Packaging Inventory',
            description: `Stock received against ${existing.poNumber}`,
            debit: existing.grandTotal,
            credit: 0
          },
          {
            id: `ln_${poId}_2`,
            accountId: 'acc_ap',
            accountName: 'Accounts Payable (Suppliers)',
            description: `Payable to ${existing.supplierName}`,
            debit: 0,
            credit: existing.grandTotal
          }
        ],
        totalDebit: existing.grandTotal,
        totalCredit: existing.grandTotal,
        createdBy: 'Purchasing GRN'
      });

      await offlineDB.updateDoc<PurchaseOrder>('purchase_orders', poId, {
        status,
        items: updatedItems
      });
    } else {
      await offlineDB.updateDoc<PurchaseOrder>('purchase_orders', poId, { status });
    }

    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'purchase_orders', poId), { status });
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async addSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt'>): Promise<Supplier> {
    await this.ensureInitialized();
    const newSupplier: Supplier = {
      ...supplierData,
      id: `sup_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await offlineDB.setDoc('suppliers', newSupplier.id, newSupplier);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'suppliers', newSupplier.id), newSupplier);
      } catch {
        // Queued via offlineDB
      }
    }
    return newSupplier;
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Supplier>('suppliers', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'suppliers', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('suppliers', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'suppliers', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('purchase_orders', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'purchase_orders', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }
}

export const purchasingService = new PurchasingService();
