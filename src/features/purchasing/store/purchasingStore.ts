import { create } from 'zustand';
import { Supplier, PurchaseOrder } from '../models/purchasing';
import { purchasingService } from '../services/purchasingService';
import { useInventoryStore } from '../../inventory/store/inventoryStore';

interface PurchasingState {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  loading: boolean;
  error: string | null;

  loadSuppliers: () => Promise<void>;
  loadPurchaseOrders: () => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<Supplier>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  createPO: (po: Omit<PurchaseOrder, 'id' | 'poNumber' | 'createdAt'>) => Promise<PurchaseOrder>;
  updatePOStatus: (poId: string, status: PurchaseOrder['status']) => Promise<void>;
  deletePO: (poId: string) => Promise<void>;
}

export const usePurchasingStore = create<PurchasingState>((set) => ({
  suppliers: [],
  purchaseOrders: [],
  loading: false,
  error: null,

  loadSuppliers: async () => {
    set({ loading: true, error: null });
    try {
      const suppliers = await purchasingService.getSuppliers();
      set({ suppliers, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadPurchaseOrders: async () => {
    set({ loading: true, error: null });
    try {
      const purchaseOrders = await purchasingService.getPurchaseOrders();
      set({ purchaseOrders, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addSupplier: async (supplierData) => {
    set({ error: null });
    try {
      const newSupplier = await purchasingService.addSupplier(supplierData);
      set(state => ({ suppliers: [newSupplier, ...state.suppliers] }));
      return newSupplier;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  updateSupplier: async (id, data) => {
    try {
      await purchasingService.updateSupplier(id, data);
      set(state => ({
        suppliers: state.suppliers.map(s => (s.id === id ? { ...s, ...data } : s))
      }));
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  deleteSupplier: async (id) => {
    try {
      await purchasingService.deleteSupplier(id);
      set(state => ({
        suppliers: state.suppliers.filter(s => s.id !== id)
      }));
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  createPO: async (po) => {
    set({ loading: true, error: null });
    try {
      const newPO = await purchasingService.createPurchaseOrder(po);
      set(state => ({
        purchaseOrders: [newPO, ...state.purchaseOrders],
        loading: false
      }));
      return newPO;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      throw e;
    }
  },

  updatePOStatus: async (poId, status) => {
    try {
      await purchasingService.updatePurchaseOrderStatus(poId, status);
      const updatedOrders = await purchasingService.getPurchaseOrders();
      set({ purchaseOrders: updatedOrders });
      if (status === 'FULFILLED') {
        // Refresh inventory store so newly received stock balances are reflected immediately
        await useInventoryStore.getState().loadInitialData().catch(() => {});
      }
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  deletePO: async (poId) => {
    try {
      await purchasingService.deletePurchaseOrder(poId);
      set(state => ({
        purchaseOrders: state.purchaseOrders.filter(p => p.id !== poId)
      }));
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  }
}));
