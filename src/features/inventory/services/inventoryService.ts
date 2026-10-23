import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, DEFAULT_CATEGORIES, DEFAULT_WAREHOUSES } from '../../../core/offline/db';
import { InventoryItem, Category, Warehouse, StockTransaction, ItemBatch, StorageLocation, CycleCount } from '../models/inventory';

class InventoryService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  // --- Categories ---
  async getCategories(): Promise<Category[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Category>('inventory_categories');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_categories')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Category));
          const merged = new Map<string, Category>();
          for (const c of local) merged.set(c.id, c);
          for (const c of remote) merged.set(c.id, c);
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('inventory_categories', list);
          return list;
        }
      } catch {
        // Fallback to offline DB
      }
    }
    return local.length > 0 ? local : DEFAULT_CATEGORIES;
  }

  async addCategory(categoryData: Omit<Category, 'id' | 'createdAt'>): Promise<Category> {
    await this.ensureInitialized();
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await offlineDB.setDoc('inventory_categories', newCategory.id, newCategory);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'inventory_categories', newCategory.id), newCategory);
      } catch {
        // Synced via offlineDB queue
      }
    }
    return newCategory;
  }

  // --- Warehouses ---
  async getWarehouses(): Promise<Warehouse[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Warehouse>('inventory_warehouses');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_warehouses')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse));
          await offlineDB.replaceCollectionLocal('inventory_warehouses', remote);
          return remote;
        }
      } catch {
        // Fallback to offline DB
      }
    }
    return local.length > 0 ? local : DEFAULT_WAREHOUSES;
  }

  async addWarehouse(warehouseData: Omit<Warehouse, 'id'>): Promise<Warehouse> {
    await this.ensureInitialized();
    const newWarehouse: Warehouse = {
      ...warehouseData,
      id: `wh_${Date.now()}`
    };
    await offlineDB.setDoc('inventory_warehouses', newWarehouse.id, newWarehouse);
    return newWarehouse;
  }

  // --- Storage Locations ---
  async getStorageLocations(): Promise<StorageLocation[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<StorageLocation>('inventory_storage_locations');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_storage_locations')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StorageLocation));
          await offlineDB.replaceCollectionLocal('inventory_storage_locations', remote);
          return remote;
        }
      } catch {
        // Fallback to offline DB
      }
    }
    return local;
  }

  async addStorageLocation(locationData: Omit<StorageLocation, 'id'>): Promise<StorageLocation> {
    await this.ensureInitialized();
    const newLocation: StorageLocation = {
      ...locationData,
      id: `loc_${Date.now()}`
    };
    await offlineDB.setDoc('inventory_storage_locations', newLocation.id, newLocation);
    return newLocation;
  }

  // --- Items ---
  async getItems(): Promise<InventoryItem[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<InventoryItem>('inventory_items');
    const merged = new Map<string, InventoryItem>();
    for (const item of local) {
      merged.set(item.id, item);
    }

    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_items')));
        for (const d of snapshot.docs) {
          const remoteItem = { id: d.id, ...d.data() } as InventoryItem;
          const existingLocal = merged.get(d.id);
          if (!existingLocal) {
            merged.set(d.id, remoteItem);
          } else {
            // Preserve local stock if local was updated more recently; otherwise take remote
            const localTime = new Date(existingLocal.lastUpdated || 0).getTime();
            const remoteTime = new Date(remoteItem.lastUpdated || 0).getTime();
            if (remoteTime > localTime) {
              merged.set(d.id, remoteItem);
            }
          }
        }
        await offlineDB.replaceCollectionLocal('inventory_items', Array.from(merged.values()));
      } catch {
        // Offline or permission restricted — continue with local 144 master items
      }
    }

    return Array.from(merged.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  async addItem(itemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'createdAt' | 'currentStock'> & { id?: string; currentStock?: number }): Promise<InventoryItem> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    const id = itemData.id || itemData.sku || `inv_${Date.now()}`;
    const existing = await offlineDB.getDoc<InventoryItem>('inventory_items', id);
    const newItem: InventoryItem = {
      ...itemData,
      id,
      // Initialize stock balance to 0 only for genuinely new records; never overwrite existing balances
      currentStock: existing ? existing.currentStock : (itemData.currentStock ?? 0),
      lastUpdated: now,
      createdAt: existing?.createdAt || now
    };
    await offlineDB.setDoc('inventory_items', newItem.id, newItem);
    return newItem;
  }

  async updateItem(id: string, data: Partial<InventoryItem>): Promise<void> {
    await this.ensureInitialized();
    const now = new Date().toISOString();
    await offlineDB.updateDoc<InventoryItem>('inventory_items', id, { ...data, lastUpdated: now });
  }

  async deleteItem(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('inventory_items', id);
  }

  // --- Batches ---
  async getBatches(): Promise<ItemBatch[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<ItemBatch>('inventory_batches');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_batches')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ItemBatch));
          await offlineDB.replaceCollectionLocal('inventory_batches', remote);
          return remote;
        }
      } catch {
        // Fallback to offline DB
      }
    }
    return local;
  }

  async addBatch(batchData: Omit<ItemBatch, 'id'>): Promise<ItemBatch> {
    await this.ensureInitialized();
    const newBatch: ItemBatch = {
      ...batchData,
      id: `bat_${Date.now()}`
    };
    await offlineDB.setDoc('inventory_batches', newBatch.id, newBatch);
    return newBatch;
  }

  async updateBatch(id: string, data: Partial<ItemBatch>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<ItemBatch>('inventory_batches', id, data);
  }

  // --- Cycle Counts ---
  async getCycleCounts(): Promise<CycleCount[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<CycleCount>('inventory_cycle_counts');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_cycle_counts')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CycleCount));
          await offlineDB.replaceCollectionLocal('inventory_cycle_counts', remote);
          return remote;
        }
      } catch {
        // Fallback to offline DB
      }
    }
    return local;
  }

  async addCycleCount(countData: Omit<CycleCount, 'id' | 'createdAt'>): Promise<CycleCount> {
    await this.ensureInitialized();
    const newCount: CycleCount = {
      ...countData,
      id: `cc_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    await offlineDB.setDoc('inventory_cycle_counts', newCount.id, newCount);
    return newCount;
  }

  async updateCycleCount(id: string, data: Partial<CycleCount>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<CycleCount>('inventory_cycle_counts', id, data);
  }

  // --- Transactions ---
  async getTransactions(): Promise<StockTransaction[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<StockTransaction>('inventory_transactions');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'inventory_transactions')));
        if (!snapshot.empty) {
          const merged = new Map<string, StockTransaction>();
          for (const t of local) merged.set(t.id, t);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as StockTransaction);
          }
          const all = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('inventory_transactions', all);
          return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      } catch {
        // Offline fallback
      }
    }
    return local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async recordTransaction(transactionData: Omit<StockTransaction, 'id' | 'date'> & { idempotencyKey?: string }): Promise<StockTransaction> {
    await this.ensureInitialized();
    const { idempotencyKey, ...stockData } = transactionData;
    if (idempotencyKey && !/^[A-Za-z0-9_-]{1,180}$/.test(idempotencyKey)) {
      throw new Error('Invalid stock transaction idempotency key');
    }
    if (!Number.isFinite(stockData.quantity) || stockData.quantity <= 0) {
      throw new Error('Stock quantity must be positive');
    }

    const txnId = idempotencyKey ? `txn_${idempotencyKey}` : `txn_${crypto.randomUUID()}`;
    const existingLocalTxn = await offlineDB.getDoc<StockTransaction>('inventory_transactions', txnId);
    if (existingLocalTxn) {
      if (
        existingLocalTxn.itemId !== stockData.itemId ||
        existingLocalTxn.type !== stockData.type ||
        Math.abs(existingLocalTxn.quantity - stockData.quantity) > 1e-6 ||
        existingLocalTxn.referenceId !== stockData.referenceId
      ) {
        throw new Error('Stock idempotency key reused with different transaction data');
      }
      return existingLocalTxn;
    }

    const itemData = await offlineDB.getDoc<InventoryItem>('inventory_items', stockData.itemId);
    if (!itemData) {
      throw new Error(`Inventory item ${stockData.itemId} does not exist!`);
    }

    const now = new Date().toISOString();
    const newTransaction: StockTransaction = {
      ...stockData,
      id: txnId,
      date: now
    };

    const currentStock = itemData.currentStock || 0;
    let stockChange = 0;

    switch (newTransaction.type) {
      case 'STOCK_IN':
      case 'RETURN':
      case 'OPENING':
        stockChange = newTransaction.quantity;
        break;
      case 'STOCK_OUT':
      case 'DAMAGE':
      case 'WASTAGE':
      case 'EXPIRY':
        stockChange = -newTransaction.quantity;
        break;
      case 'ADJUSTMENT':
      case 'PHYSICAL_VERIFICATION':
        stockChange = newTransaction.quantity;
        break;
      case 'TRANSFER':
        stockChange = 0;
        break;
    }

    const newStock = Math.round((currentStock + stockChange) * 10000) / 10000;
    let newCostPrice = itemData.costPrice;

    if (newTransaction.type === 'STOCK_IN' && itemData.valuationMethod === 'WEIGHTED_AVERAGE' && newTransaction.unitCost > 0) {
      const safeCurrentStock = Math.max(0, currentStock);
      const totalCurrentValue = safeCurrentStock * (itemData.costPrice || 0);
      const totalNewValue = newTransaction.quantity * newTransaction.unitCost;
      if (safeCurrentStock + newTransaction.quantity > 0) {
        newCostPrice = Math.round(((totalCurrentValue + totalNewValue) / (safeCurrentStock + newTransaction.quantity)) * 100) / 100;
      }
    }

    // 1. Commit atomically to local persistent store and enqueue cloud sync
    await offlineDB.updateDoc<InventoryItem>('inventory_items', itemData.id, {
      currentStock: newStock,
      costPrice: newCostPrice,
      lastUpdated: now
    });

    if (newTransaction.batchId) {
      const batchData = await offlineDB.getDoc<ItemBatch>('inventory_batches', newTransaction.batchId);
      if (batchData) {
        const newBatchStock = batchData.currentQuantity + stockChange;
        await offlineDB.updateDoc<ItemBatch>('inventory_batches', newTransaction.batchId, {
          currentQuantity: Math.max(0, newBatchStock),
          status: newBatchStock <= 0 ? 'DEPLETED' : batchData.status
        });
      }
    }

    await offlineDB.setDoc<StockTransaction>('inventory_transactions', newTransaction.id, newTransaction);

    // 2. If online and authenticated in Firestore, also attempt direct Firestore transaction
    if (db && auth?.currentUser) {
      try {
        await runTransaction(db, async (transaction) => {
          const txnRef = doc(db, 'inventory_transactions', newTransaction.id);
          const existingTxn = await transaction.get(txnRef);
          if (existingTxn.exists()) return;

          const itemRef = doc(db, 'inventory_items', newTransaction.itemId);
          const itemDoc = await transaction.get(itemRef);
          if (itemDoc.exists()) {
            transaction.update(itemRef, {
              currentStock: newStock,
              costPrice: newCostPrice,
              lastUpdated: now
            });
          } else {
            transaction.set(itemRef, {
              ...itemData,
              currentStock: newStock,
              costPrice: newCostPrice,
              lastUpdated: now
            });
          }
          transaction.set(txnRef, newTransaction);
        });
      } catch {
        // Handled by offlineDB outbox queue
      }
    }

    return newTransaction;
  }
}

export const inventoryService = new InventoryService();
