import localforage from 'localforage';
import { doc, setDoc as firestoreSetDoc, deleteDoc as firestoreDeleteDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { MASTER_INVENTORY } from '../../features/inventory/data/masterInventory';
import { StagedInventoryItem } from '../../features/inventory/services/inventoryStaging';
import { InventoryItem } from '../../features/inventory/models/inventory';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../../features/pos/data/menuData';
import { MASTER_RECIPES, APPROVED_STAGED_RECIPES } from '../../features/manufacturing/data/masterRecipes';
import { logger } from '../logging/logger';

localforage.config({
  name: 'TalkOS',
  version: 1.0,
  storeName: 'talkos_offline_db',
  description: 'TalkOS Offline Database for persistent local ERP storage and cloud sync queue'
});

export interface SyncOperation {
  id: string;
  collectionName: string;
  docId: string;
  action: 'UPSERT' | 'DELETE';
  payload?: any;
  timestamp: string;
  retries: number;
  lastError?: string;
}

export interface SyncStatusSummary {
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  isSyncing: boolean;
  dbInitialized: boolean;
}

export interface TalkOSBackupSnapshot {
  schemaVersion: string;
  exportedAt: string;
  restaurantName: string;
  collections: Record<string, any[]>;
}

const COLLECTION_PREFIX = 'col_';
const SYNC_QUEUE_KEY = 'talkos_sync_outbox';
const SYNC_META_KEY = 'talkos_sync_meta';

let isFlushingQueue = false;
const syncListeners = new Set<(status: SyncStatusSummary) => void>();

// Default unit costs for recipe-linked items so ingredient deductions have accurate valuation
const DEFAULT_UNIT_COSTS: Record<string, number> = {
  'TOT-001': 240,
  'TOT-002': 340,
  'TOT-003': 7,
  'TOT-004': 65,
  'TOT-005': 60,
  'TOT-006': 135,
  'TOT-007': 90,
  'TOT-008': 110,
  'TOT-009': 75,
  'TOT-010': 95,
  'TOT-011': 160,
  'TOT-012': 140,
  'TOT-013': 120,
  'TOT-014': 40,
  'TOT-015': 60,
  'TOT-016': 80,
  'TOT-017': 70,
  'TOT-018': 35,
  'TOT-019': 45,
  'TOT-020': 60,
  'TOT-021': 25,
  'TOT-022': 48,
  'TOT-023': 450,
  'TOT-024': 180,
  'TOT-025': 260,
  'TOT-026': 70,
  'TOT-027': 45,
  'TOT-028': 20,
  'TOT-029': 80,
  'TOT-030': 520,
  'TOT-031': 4.5,
  'TOT-032': 3.2,
  'TOT-033': 1.5,
  'TOT-034': 1.0,
  'TOT-035': 2.5,
  'TOT-038': 0.8,
  'TOT-039': 0.5,
  'TOT-041': 0.5
};

export function mapMasterRecordToInventoryItem(item: StagedInventoryItem, existing?: Partial<InventoryItem>): InventoryItem {
  const now = new Date().toISOString();
  return {
    id: item.id,
    sku: item.id,
    name: existing?.name || item.name,
    categoryId: existing?.categoryId || item.category,
    unit: existing?.unit || item.unit,
    // CRITICAL RULE: Initialize stock balances to zero ONLY for genuinely new records; never overwrite existing balances.
    currentStock: typeof existing?.currentStock === 'number' ? existing.currentStock : 0,
    costPrice: typeof existing?.costPrice === 'number' && existing.costPrice > 0 ? existing.costPrice : (DEFAULT_UNIT_COSTS[item.id] ?? 0),
    sellingPrice: typeof existing?.sellingPrice === 'number' ? existing.sellingPrice : 0,
    reorderLevel: typeof existing?.reorderLevel === 'number' ? existing.reorderLevel : (item.deductionType === 'Recipe-Linked' ? 5 : 2),
    minimumStock: typeof existing?.minimumStock === 'number' ? existing.minimumStock : (item.deductionType === 'Recipe-Linked' ? 2 : 1),
    status: existing?.status || 'ACTIVE',
    valuationMethod: existing?.valuationMethod || 'WEIGHTED_AVERAGE',
    lastUpdated: existing?.lastUpdated || now,
    createdAt: existing?.createdAt || now
  };
}

export const DEFAULT_CATEGORIES = [
  { id: 'FOOD & RAW MATERIALS', name: 'FOOD & RAW MATERIALS', description: 'Meats, vegetables, noodles, rice, sauces, and cooking aromatics', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'PACKAGING & DISPOSABLES', name: 'PACKAGING & DISPOSABLES', description: 'Foil containers, lids, bags, cutlery, and napkins', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'DINE-IN SERVICEWARE (REUSABLE)', name: 'DINE-IN SERVICEWARE (REUSABLE)', description: 'Plates, bowls, cutlery, and glassware', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'KITCHEN EQUIPMENT & SMALLWARES', name: 'KITCHEN EQUIPMENT & SMALLWARES', description: 'Woks, burners, prep tables, and kitchen tools', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'CLEANING, TOILETRIES & HOUSEKEEPING', name: 'CLEANING, TOILETRIES & HOUSEKEEPING', description: 'Sanitizers, soaps, cleaning supplies, and kitchen PPE', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'WATER SYSTEM', name: 'WATER SYSTEM', description: 'RO purifier, filters, tanks, and plumbing spares', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'GAS / FUEL SYSTEM', name: 'GAS / FUEL SYSTEM', description: 'Commercial LPG cylinders, regulators, hoses, and safety detectors', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'ELECTRICAL, LIGHTING & REFRIGERATION', name: 'ELECTRICAL, LIGHTING & REFRIGERATION', description: 'Lighting, fans, backup power, and electrical spares', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'FURNITURE & FRONT-OF-HOUSE', name: 'FURNITURE & FRONT-OF-HOUSE', description: 'Dining tables, chairs, counter desk, and cash drawer', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'POS, BILLING & OFFICE SUPPLIES', name: 'POS, BILLING & OFFICE SUPPLIES', description: 'POS tablet, thermal printer, paper rolls, and stationery', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'STAFF UNIFORM & PPE', name: 'STAFF UNIFORM & PPE', description: 'Uniform shirts, aprons, caps, and safety footwear', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'SAFETY & FIRE EQUIPMENT', name: 'SAFETY & FIRE EQUIPMENT', description: 'Fire extinguisher, first aid kit, fire blanket, and smoke detectors', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'SIGNAGE & BRANDING', name: 'SIGNAGE & BRANDING', description: 'Signboards, menu standees, and branded stickers', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' },
  { id: 'MISCELLANEOUS / MAINTENANCE', name: 'MISCELLANEOUS / MAINTENANCE', description: 'Pest control, spare bulbs, and maintenance toolkit', isActive: true, createdAt: '2026-01-01T00:00:00.000Z' }
];

export const DEFAULT_WAREHOUSES = [
  { id: 'wh_main', name: 'Main Kitchen & Dry Store', type: 'MAIN_STORE' as const, location: 'Talk of the Town Main Outlet', isActive: true },
  { id: 'wh_wok', name: 'Wok & Chilly Line Prep Store', type: 'KITCHEN_STORE' as const, location: 'Kitchen Line', isActive: true }
];

export const DEFAULT_ACCOUNTS = [
  { id: 'acc_cash', code: '1000', name: 'Cash on Hand / Register', type: 'ASSET' as const, group: 'CURRENT_ASSET' as const, balance: 0, isActive: true, description: 'POS Cash Drawer & Petty Cash' },
  { id: 'acc_bank', code: '1010', name: 'Bank / UPI Settlement Account', type: 'ASSET' as const, group: 'CURRENT_ASSET' as const, balance: 0, isActive: true, description: 'UPI, Card & Bank Transfers' },
  { id: 'acc_inventory', code: '1200', name: 'Kitchen & Packaging Inventory', type: 'ASSET' as const, group: 'CURRENT_ASSET' as const, balance: 0, isActive: true, description: 'Raw Materials & Disposables Valuation' },
  { id: 'acc_ap', code: '2000', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY' as const, group: 'CURRENT_LIABILITY' as const, balance: 0, isActive: true, description: 'Vendor & Purchase Order Payables' },
  { id: 'acc_gst', code: '2100', name: 'GST Payable (CGST + SGST)', type: 'LIABILITY' as const, group: 'CURRENT_LIABILITY' as const, balance: 0, isActive: true, description: 'Output GST Collected on Sales' },
  { id: 'acc_equity', code: '3000', name: 'Owner Equity', type: 'EQUITY' as const, group: 'REVENUE' as const, balance: 0, isActive: true, description: 'Talk of the Town Capital Account' },
  { id: 'acc_sales', code: '4000', name: 'Food & Beverage Sales Revenue', type: 'INCOME' as const, group: 'REVENUE' as const, balance: 0, isActive: true, description: 'Dine-In, Takeaway & Delivery Sales' },
  { id: 'acc_cogs', code: '5000', name: 'Cost of Goods Sold (Ingredients & Packaging)', type: 'EXPENSE' as const, group: 'COST_OF_SALES' as const, balance: 0, isActive: true, description: 'Direct Recipe & Packaging Consumption' },
  { id: 'acc_opex', code: '5100', name: 'Restaurant Operating Expenses', type: 'EXPENSE' as const, group: 'OPERATING_EXPENSE' as const, balance: 0, isActive: true, description: 'Utilities, Gas, Cleaning & Maintenance' }
];

export const DEFAULT_KDS_STATIONS = [
  { id: 'st_1', name: 'Main Wok Station (Chowmein & Fried Rice)', type: 'KITCHEN' as const, isActive: true },
  { id: 'st_2', name: 'Chilly & Specials Station', type: 'KITCHEN' as const, isActive: true },
  { id: 'st_3', name: 'Packing & Dispatch Counter', type: 'PACKING' as const, isActive: true }
];

export const DEFAULT_FLOORS = [
  { id: 'floor_main', name: 'Main Dining Hall', zone: 'Indoor', isActive: true, order: 1 }
];

export const DEFAULT_TABLES = [
  { id: 'tbl_1', floorId: 'floor_main', tableNumber: 'Table 1', capacity: 2, shape: 'SQUARE' as const, positionX: 40, positionY: 40, width: 90, height: 90, status: 'AVAILABLE' as const, locked: false },
  { id: 'tbl_2', floorId: 'floor_main', tableNumber: 'Table 2', capacity: 4, shape: 'RECTANGLE' as const, positionX: 180, positionY: 40, width: 120, height: 90, status: 'AVAILABLE' as const, locked: false },
  { id: 'tbl_3', floorId: 'floor_main', tableNumber: 'Table 3', capacity: 4, shape: 'RECTANGLE' as const, positionX: 340, positionY: 40, width: 120, height: 90, status: 'AVAILABLE' as const, locked: false },
  { id: 'tbl_4', floorId: 'floor_main', tableNumber: 'Table 4', capacity: 6, shape: 'RECTANGLE' as const, positionX: 40, positionY: 180, width: 140, height: 100, status: 'AVAILABLE' as const, locked: false },
  { id: 'tbl_5', floorId: 'floor_main', tableNumber: 'Table 5', capacity: 4, shape: 'ROUND' as const, positionX: 220, positionY: 180, width: 100, height: 100, status: 'AVAILABLE' as const, locked: false },
  { id: 'tbl_6', floorId: 'floor_main', tableNumber: 'Table 6', capacity: 2, shape: 'SQUARE' as const, positionX: 360, positionY: 180, width: 90, height: 90, status: 'AVAILABLE' as const, locked: false }
];

export const DEFAULT_BRANCHES = [
  {
    id: 'br_main',
    name: 'Talk of the Town — Main Outlet',
    code: 'TOT-MAIN',
    address: 'Main Market Road',
    phone: '+91 98000 00000',
    status: 'ACTIVE' as const
  }
];

export const DEFAULT_STAFF_PROFILES = [
  { id: 'DeQd1Y2YWjQt0eFjQ4iWPThuBAJ3', name: 'Talk of the Town (Owner)', role: 'OWNER' as const, email: 'talkofthetown312@gmail.com', pin: '1234', status: 'ACTIVE' as const, branchIds: ['br_main'], department: 'Management', position: 'Owner', salary: 0, joinDate: '2026-01-01', phone: '+91 98000 00001' },
  { id: 'staff_manager', name: 'Duty Manager', role: 'MANAGER' as const, email: 'manager@talkofthetown.local', pin: '2222', status: 'ACTIVE' as const, branchIds: ['br_main'], department: 'Management', position: 'Manager', salary: 0, joinDate: '2026-01-01', phone: '+91 98000 00002' },
  { id: 'staff_cashier', name: 'POS Cashier', role: 'CASHIER' as const, email: 'cashier@talkofthetown.local', pin: '1111', status: 'ACTIVE' as const, branchIds: ['br_main'], department: 'Front of House', position: 'Cashier', salary: 0, joinDate: '2026-01-01', phone: '+91 98000 00003' },
  { id: 'staff_kitchen', name: 'Head Chef (KDS)', role: 'CHEF' as const, email: 'kitchen@talkofthetown.local', pin: '3333', status: 'ACTIVE' as const, branchIds: ['br_main'], department: 'Kitchen', position: 'Head Chef', salary: 0, joinDate: '2026-01-01', phone: '+91 98000 00004' }
];

export const ALL_TALKOS_COLLECTIONS = [
  'inventory_items',
  'inventory_categories',
  'inventory_warehouses',
  'inventory_storage_locations',
  'inventory_batches',
  'inventory_cycle_counts',
  'inventory_transactions',
  'inventory_recipe_staging',
  'pos_products',
  'menu_item_sizes',
  'pos_orders',
  'manufacturing_recipes',
  'manufacturing_orders',
  'tickets',
  'stations',
  'suppliers',
  'purchase_orders',
  'finance_accounts',
  'finance_transactions',
  'customers',
  'promotions',
  'hr_employees',
  'hr_attendance',
  'hr_leaves',
  'hr_payroll',
  'table_floors',
  'table_items',
  'table_reservations',
  'table_waitlist',
  'admin_users',
  'admin_branches',
  'admin_config',
  'admin_audit_logs',
  'reports_metrics'
] as const;

async function notifySyncListeners() {
  const status = await offlineDB.getSyncStatus();
  syncListeners.forEach((cb) => {
    try {
      cb(status);
    } catch {
      // ignore listener errors
    }
  });
}

// Resilient storage wrapper: uses localforage (IndexedDB/WebSQL/localStorage) in browsers
// and automatically falls back to an in-memory Map in Node/Vitest or restricted WebViews.
const memoryFallbackStore = new Map<string, any>();

async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const val = await localforage.getItem<T>(key);
    if (val !== null && val !== undefined) {
      return val;
    }
  } catch {
    // Fallback to memory store
  }
  return memoryFallbackStore.has(key) ? (memoryFallbackStore.get(key) as T) : null;
}

async function storageSet<T>(key: string, value: T): Promise<T> {
  memoryFallbackStore.set(key, value);
  try {
    await localforage.setItem(key, value);
  } catch {
    // Saved in memoryFallbackStore
  }
  return value;
}

async function storageRemove(key: string): Promise<void> {
  memoryFallbackStore.delete(key);
  try {
    await localforage.removeItem(key);
  } catch {
    // Removed from memoryFallbackStore
  }
}

async function storageClear(): Promise<void> {
  memoryFallbackStore.clear();
  try {
    await localforage.clear();
  } catch {
    // Cleared memoryFallbackStore
  }
}

export const offlineDB = {
  setItem: async <T>(key: string, value: T): Promise<T> => {
    return await storageSet(key, value);
  },
  getItem: async <T>(key: string): Promise<T | null> => {
    return await storageGet<T>(key);
  },
  removeItem: async (key: string): Promise<void> => {
    return await storageRemove(key);
  },
  clear: async (): Promise<void> => {
    return await storageClear();
  },

  // ==================== COLLECTION LEVEL CRUD ====================
  getCollection: async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map = await storageGet<Record<string, T>>(key);
    if (!map || typeof map !== 'object') return [];
    return Object.values(map);
  },

  getDoc: async <T extends { id: string }>(collectionName: string, docId: string): Promise<T | null> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map = await storageGet<Record<string, T>>(key);
    if (!map || !map[docId]) return null;
    return map[docId];
  },

  setDoc: async <T extends { id: string }>(
    collectionName: string,
    docId: string,
    data: T,
    options: { syncToCloud?: boolean } = { syncToCloud: true }
  ): Promise<T> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map = { ...((await storageGet<Record<string, T>>(key)) || {}) };
    const record = { ...data, id: docId };
    map[docId] = record;
    await storageSet(key, map);

    if (options.syncToCloud !== false) {
      await offlineDB.enqueueSync({
        id: `${collectionName}:${docId}`,
        collectionName,
        docId,
        action: 'UPSERT',
        payload: record,
        timestamp: new Date().toISOString(),
        retries: 0
      });
    }
    return record;
  },

  updateDoc: async <T extends { id: string }>(
    collectionName: string,
    docId: string,
    updates: Partial<T>,
    options: { syncToCloud?: boolean } = { syncToCloud: true }
  ): Promise<T | null> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map = { ...((await storageGet<Record<string, T>>(key)) || {}) };
    const existing = map[docId];
    if (!existing) return null;
    const updated = { ...existing, ...updates, id: docId };
    map[docId] = updated;
    await storageSet(key, map);

    if (options.syncToCloud !== false) {
      await offlineDB.enqueueSync({
        id: `${collectionName}:${docId}`,
        collectionName,
        docId,
        action: 'UPSERT',
        payload: updated,
        timestamp: new Date().toISOString(),
        retries: 0
      });
    }
    return updated;
  },

  deleteDoc: async (
    collectionName: string,
    docId: string,
    options: { syncToCloud?: boolean } = { syncToCloud: true }
  ): Promise<void> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map = { ...((await storageGet<Record<string, any>>(key)) || {}) };
    delete map[docId];
    await storageSet(key, map);

    if (options.syncToCloud !== false) {
      await offlineDB.enqueueSync({
        id: `${collectionName}:${docId}`,
        collectionName,
        docId,
        action: 'DELETE',
        timestamp: new Date().toISOString(),
        retries: 0
      });
    }
  },

  replaceCollectionLocal: async <T extends { id: string }>(collectionName: string, items: T[]): Promise<void> => {
    const key = `${COLLECTION_PREFIX}${collectionName}`;
    const map: Record<string, T> = {};
    for (const item of items) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    await storageSet(key, map);
  },

  // ==================== SYNC OUTBOX QUEUE ====================
  enqueueSync: async (op: SyncOperation): Promise<void> => {
    const queue = { ...((await storageGet<Record<string, SyncOperation>>(SYNC_QUEUE_KEY)) || {}) };
    queue[op.id] = op;
    await storageSet(SYNC_QUEUE_KEY, queue);
    await notifySyncListeners();

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setTimeout(() => {
        offlineDB.flushSyncQueue().catch(() => {});
      }, 50);
    }
  },

  getSyncQueue: async (): Promise<SyncOperation[]> => {
    const queue = (await storageGet<Record<string, SyncOperation>>(SYNC_QUEUE_KEY)) || {};
    return Object.values(queue).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  },

  getSyncStatus: async (): Promise<SyncStatusSummary> => {
    const queue = (await storageGet<Record<string, SyncOperation>>(SYNC_QUEUE_KEY)) || {};
    const meta = (await storageGet<{ lastSyncedAt: string | null; lastError: string | null; dbInitialized: boolean }>(SYNC_META_KEY)) || {
      lastSyncedAt: null,
      lastError: null,
      dbInitialized: false
    };
    return {
      pendingCount: Object.keys(queue).length,
      lastSyncedAt: meta.lastSyncedAt,
      lastError: meta.lastError,
      isSyncing: isFlushingQueue,
      dbInitialized: meta.dbInitialized
    };
  },

  subscribeSyncStatus: (listener: (status: SyncStatusSummary) => void): (() => void) => {
    syncListeners.add(listener);
    offlineDB.getSyncStatus().then(listener).catch(() => {});
    return () => {
      syncListeners.delete(listener);
    };
  },

  flushSyncQueue: async (): Promise<{ synced: number; failed: number }> => {
    if (isFlushingQueue) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    isFlushingQueue = true;
    await notifySyncListeners();

    let synced = 0;
    let failed = 0;
    let lastError: string | null = null;

    try {
      const queueMap = { ...((await storageGet<Record<string, SyncOperation>>(SYNC_QUEUE_KEY)) || {}) };
      const ops = Object.values(queueMap);
      if (ops.length === 0) {
        isFlushingQueue = false;
        await notifySyncListeners();
        return { synced: 0, failed: 0 };
      }

      for (const op of ops) {
        try {
          if (db) {
            if (op.action === 'UPSERT' && op.payload) {
              await firestoreSetDoc(doc(db, op.collectionName, op.docId), JSON.parse(JSON.stringify(op.payload)), { merge: true });
            } else if (op.action === 'DELETE') {
              await firestoreDeleteDoc(doc(db, op.collectionName, op.docId));
            }
            delete queueMap[op.id];
            synced++;
            continue;
          }
          throw new Error('Firestore not initialized');
        } catch (err: any) {
          // Try server-side sync relay if direct client write is denied (e.g. PIN-only session)
          try {
            const resp = await fetch('/api/sync/mutation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(op)
            });
            if (resp.ok) {
              delete queueMap[op.id];
              synced++;
              continue;
            }
          } catch {
            // Server relay not reachable or offline
          }
          op.retries = (op.retries || 0) + 1;
          op.lastError = err?.message || 'Cloud sync deferred';
          lastError = op.lastError || null;
          queueMap[op.id] = op;
          failed++;
        }
      }

      await storageSet(SYNC_QUEUE_KEY, queueMap);
      const meta = (await storageGet<any>(SYNC_META_KEY)) || {};
      await storageSet(SYNC_META_KEY, {
        ...meta,
        lastSyncedAt: synced > 0 ? new Date().toISOString() : (meta.lastSyncedAt || null),
        lastError
      });
    } finally {
      isFlushingQueue = false;
      await notifySyncListeners();
    }

    return { synced, failed };
  },

  // ==================== IDEMPOTENT DATABASE INITIALIZATION ====================
  initializeTalkOSDatabase: async (options: { syncToCloud?: boolean } = { syncToCloud: false }): Promise<{
    inventoryCount: number;
    menuItemsCount: number;
    menuSizesCount: number;
    recipesCount: number;
    newlyCreatedInventory: number;
  }> => {
    const syncToCloud = options.syncToCloud ?? false;

    // 1. Pull existing local inventory (and remote if reachable) so we never overwrite existing balances
    const existingLocalInv = await offlineDB.getCollection<InventoryItem>('inventory_items');
    const invMap: Record<string, InventoryItem> = {};
    for (const item of existingLocalInv) {
      invMap[item.id] = item;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine && db) {
      try {
        const snap = await getDocs(collection(db, 'inventory_items'));
        snap.docs.forEach((d) => {
          const remoteItem = { id: d.id, ...(d.data() as any) } as InventoryItem;
          if (!invMap[d.id]) {
            invMap[d.id] = remoteItem;
          }
        });
      } catch {
        // Offline or unauthenticated - proceed with local persistence
      }
    }

    // 2. Ensure all 144 Master Inventory items exist with original IDs (TOT-001..TOT-144)
    let newlyCreatedInventory = 0;
    for (const masterItem of MASTER_INVENTORY) {
      const existing = invMap[masterItem.id];
      if (!existing) {
        newlyCreatedInventory++;
      }
      invMap[masterItem.id] = mapMasterRecordToInventoryItem(masterItem, existing);
    }
    await storageSet(`${COLLECTION_PREFIX}inventory_items`, invMap);

    // 3. Ensure Inventory Categories & Warehouses exist
    const existingCategories = await offlineDB.getCollection<any>('inventory_categories');
    if (existingCategories.length === 0) {
      await offlineDB.replaceCollectionLocal('inventory_categories', DEFAULT_CATEGORIES);
    }
    const existingWarehouses = await offlineDB.getCollection<any>('inventory_warehouses');
    if (existingWarehouses.length === 0) {
      await offlineDB.replaceCollectionLocal('inventory_warehouses', DEFAULT_WAREHOUSES);
    }

    // 4. Ensure all 35 Talk of the Town Menu Items and Size Variants exist
    const existingMenu = await offlineDB.getCollection<any>('pos_products');
    const menuMap: Record<string, any> = {};
    for (const m of existingMenu) {
      menuMap[m.id] = m;
    }
    for (const initialItem of INITIAL_MENU_ITEMS) {
      const current = menuMap[initialItem.id];
      menuMap[initialItem.id] = current
        ? {
            ...initialItem,
            ...current,
            recipeId: current.recipeId || initialItem.recipeId,
            sizes: current.sizes && current.sizes.length > 0 ? current.sizes : initialItem.sizes
          }
        : initialItem;
    }
    await storageSet(`${COLLECTION_PREFIX}pos_products`, menuMap);

    const existingSizes = await offlineDB.getCollection<any>('menu_item_sizes');
    const sizesMap: Record<string, any> = {};
    for (const s of existingSizes) {
      if (s.id) sizesMap[s.id] = s;
    }
    for (const initialSize of getAllMenuItemSizes()) {
      const id = initialSize.id || `${initialSize.item_id}_${initialSize.size.toLowerCase()}`;
      if (!sizesMap[id]) {
        sizesMap[id] = { ...initialSize, id };
      }
    }
    await storageSet(`${COLLECTION_PREFIX}menu_item_sizes`, sizesMap);

    // 5. Ensure all 14 Approved Master Recipes exist (and purge any legacy "Classic Burger Patty" mock recipe)
    const existingRecipes = await offlineDB.getCollection<any>('manufacturing_recipes');
    const recipeMap: Record<string, any> = {};
    for (const r of existingRecipes) {
      if (r.name === 'Classic Burger Patty') continue;
      recipeMap[r.id] = r;
    }
    for (const masterRec of MASTER_RECIPES) {
      if (!recipeMap[masterRec.id]) {
        recipeMap[masterRec.id] = masterRec;
      }
    }
    await storageSet(`${COLLECTION_PREFIX}manufacturing_recipes`, recipeMap);

    const stagedRecipeMap: Record<string, any> = {};
    APPROVED_STAGED_RECIPES.forEach((sr, idx) => {
      const id = `approved_${String(idx + 1).padStart(2, '0')}`;
      stagedRecipeMap[id] = { ...sr, id };
    });
    await storageSet(`${COLLECTION_PREFIX}inventory_recipe_staging`, stagedRecipeMap);

    // 6. Initialize Chart of Accounts (0 balances for clean restaurant restart)
    const existingAccounts = await offlineDB.getCollection<any>('finance_accounts');
    if (existingAccounts.length === 0) {
      await offlineDB.replaceCollectionLocal('finance_accounts', DEFAULT_ACCOUNTS);
    }

    // 7. Initialize Kitchen Display Stations
    const existingStations = await offlineDB.getCollection<any>('stations');
    if (existingStations.length === 0) {
      await offlineDB.replaceCollectionLocal('stations', DEFAULT_KDS_STATIONS);
    }

    // 8. Initialize Default Floors & Tables
    const existingFloors = await offlineDB.getCollection<any>('table_floors');
    if (existingFloors.length === 0) {
      await offlineDB.replaceCollectionLocal('table_floors', DEFAULT_FLOORS);
    }
    const existingTables = await offlineDB.getCollection<any>('table_items');
    if (existingTables.length === 0) {
      await offlineDB.replaceCollectionLocal('table_items', DEFAULT_TABLES);
    }

    // 9. Initialize Default Branch & Staff PIN Profiles
    const existingBranches = await offlineDB.getCollection<any>('admin_branches');
    if (existingBranches.length === 0) {
      await offlineDB.replaceCollectionLocal('admin_branches', DEFAULT_BRANCHES);
    }

    const existingUsers = await offlineDB.getCollection<any>('admin_users');
    if (existingUsers.length === 0) {
      await offlineDB.replaceCollectionLocal('admin_users', DEFAULT_STAFF_PROFILES);
    }

    const existingEmployees = await offlineDB.getCollection<any>('hr_employees');
    if (existingEmployees.length === 0) {
      await offlineDB.replaceCollectionLocal('hr_employees', DEFAULT_STAFF_PROFILES);
    }

    // 10. Initialize Default System Config
    const existingConfig = await offlineDB.getDoc<any>('admin_config', 'settings');
    if (!existingConfig) {
      await offlineDB.setDoc(
        'admin_config',
        'settings',
        {
          id: 'settings',
          companyName: 'Talk of the Town',
          legalName: 'Talk of the Town Restaurant',
          taxId: 'GSTIN-PENDING',
          currency: 'INR',
          taxRate: 5,
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          receiptFooter: 'Thank you for dining at Talk of the Town!',
          autoPrintReceipt: false,
          allowNegativeInventory: true,
          kdsRefreshRateSeconds: 5,
          enableLoyalty: true,
          lowStockThreshold: 5,
          defaultStaffPin: '1234'
        },
        { syncToCloud: false }
      );
    }

    // Optionally enqueue master data to cloud when explicitly requested from Admin panel
    if (syncToCloud) {
      for (const item of Object.values(invMap)) {
        await offlineDB.setDoc('inventory_items', item.id, item, { syncToCloud: true });
      }
      for (const cat of DEFAULT_CATEGORIES) {
        await offlineDB.setDoc('inventory_categories', cat.id, cat, { syncToCloud: true });
      }
      for (const m of Object.values(menuMap)) {
        await offlineDB.setDoc('pos_products', m.id, m, { syncToCloud: true });
      }
      for (const s of Object.values(sizesMap)) {
        await offlineDB.setDoc('menu_item_sizes', s.id, s, { syncToCloud: true });
      }
      for (const r of Object.values(recipeMap)) {
        await offlineDB.setDoc('manufacturing_recipes', r.id, r, { syncToCloud: true });
      }
      for (const acc of DEFAULT_ACCOUNTS) {
        await offlineDB.setDoc('finance_accounts', acc.id, acc, { syncToCloud: true });
      }
      for (const st of DEFAULT_KDS_STATIONS) {
        await offlineDB.setDoc('stations', st.id, st, { syncToCloud: true });
      }
      await offlineDB.flushSyncQueue();
    }

    const meta = (await storageGet<any>(SYNC_META_KEY)) || {};
    await storageSet(SYNC_META_KEY, {
      ...meta,
      dbInitialized: true
    });
    await notifySyncListeners();

    logger.info('TalkOS Database initialized', {
      inventoryCount: Object.keys(invMap).length,
      menuItemsCount: Object.keys(menuMap).length,
      menuSizesCount: Object.keys(sizesMap).length,
      recipesCount: Object.keys(recipeMap).length,
      newlyCreatedInventory
    });

    return {
      inventoryCount: Object.keys(invMap).length,
      menuItemsCount: Object.keys(menuMap).length,
      menuSizesCount: Object.keys(sizesMap).length,
      recipesCount: Object.keys(recipeMap).length,
      newlyCreatedInventory
    };
  },

  // ==================== BACKUP, VALIDATION & RECOVERY ====================
  exportBackupSnapshot: async (): Promise<TalkOSBackupSnapshot> => {
    const collections: Record<string, any[]> = {};
    for (const col of ALL_TALKOS_COLLECTIONS) {
      collections[col] = await offlineDB.getCollection(col);
    }
    return {
      schemaVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      restaurantName: 'Talk of the Town',
      collections
    };
  },

  validateBackupSnapshot: (snapshot: any): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!snapshot || typeof snapshot !== 'object') {
      return { valid: false, errors: ['Snapshot must be a valid JSON object.'] };
    }
    if (!snapshot.collections || typeof snapshot.collections !== 'object') {
      errors.push('Missing "collections" object in backup file.');
    } else {
      const inv = snapshot.collections.inventory_items;
      if (inv && !Array.isArray(inv)) {
        errors.push('"collections.inventory_items" must be an array.');
      }
      const menu = snapshot.collections.pos_products;
      if (menu && !Array.isArray(menu)) {
        errors.push('"collections.pos_products" must be an array.');
      }
    }
    return { valid: errors.length === 0, errors };
  },

  restoreBackupSnapshot: async (snapshot: TalkOSBackupSnapshot, options: { syncToCloud?: boolean } = { syncToCloud: false }): Promise<void> => {
    const validation = offlineDB.validateBackupSnapshot(snapshot);
    if (!validation.valid) {
      throw new Error(`Invalid backup snapshot: ${validation.errors.join(', ')}`);
    }
    for (const [colName, docs] of Object.entries(snapshot.collections)) {
      if (Array.isArray(docs)) {
        await offlineDB.replaceCollectionLocal(colName, docs);
        if (options.syncToCloud) {
          for (const d of docs) {
            if (d && d.id) {
              await offlineDB.setDoc(colName, d.id, d, { syncToCloud: true });
            }
          }
        }
      }
    }
    await offlineDB.initializeTalkOSDatabase({ syncToCloud: options.syncToCloud });
  }
};

// Automatically flush pending sync items whenever browser connectivity returns
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    offlineDB.flushSyncQueue().catch(() => {});
  });
}
