import { describe, it, expect } from 'vitest';
import { offlineDB } from '../core/offline/db';
import { MASTER_INVENTORY } from '../features/inventory/data/masterInventory';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../features/pos/data/menuData';
import { MASTER_RECIPES } from '../features/manufacturing/data/masterRecipes';
import { inventoryService } from '../features/inventory/services/inventoryService';
import { purchasingService } from '../features/purchasing/services/purchasingService';
import { financeService } from '../features/finance/services/financeService';
import { usePosStore } from '../features/pos/store/posStore';
import { InventoryItem } from '../features/inventory/models/inventory';

describe('TalkOS Master Database Initialization & Atomic ERP Workflows', () => {
  it('preserves all 144 master inventory items, 35 menu items, 55 size records (49 multi-size + 6 standard), and 14 recipes', () => {
    expect(MASTER_INVENTORY).toHaveLength(144);
    expect(MASTER_INVENTORY[0].id).toBe('TOT-001');
    expect(MASTER_INVENTORY[143].id).toBe('TOT-144');

    expect(INITIAL_MENU_ITEMS).toHaveLength(35);
    expect(getAllMenuItemSizes()).toHaveLength(55);
    expect(MASTER_RECIPES).toHaveLength(14);
  });

  it('idempotently initializes the database with zero stock for new records and never overwrites existing stock', async () => {
    const res1 = await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
    expect(res1.inventoryCount).toBe(144);
    expect(res1.menuItemsCount).toBe(35);
    expect(res1.menuSizesCount).toBe(55);
    expect(res1.recipesCount).toBe(14);

    // Verify clean transaction history (0 fictional orders/customers/expenses)
    const orders = await offlineDB.getCollection('pos_orders');
    expect(orders).toHaveLength(0);

    // Update TOT-001 stock to 5000g and verify re-running initializeTalkOSDatabase preserves 5000g
    await inventoryService.recordTransaction({
      itemId: 'TOT-001',
      type: 'STOCK_IN',
      quantity: 5000,
      unitCost: 0.24,
      totalCost: 1200,
      notes: 'Opening physical count',
      performedBy: 'test_owner'
    });

    const itemAfterIn = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-001');
    expect(itemAfterIn?.currentStock).toBe(5000);

    // Re-run database initialization
    await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
    const itemAfterReinit = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-001');
    expect(itemAfterReinit?.currentStock).toBe(5000);
  });

  it('connects Purchase Order fulfillment to Inventory STOCK_IN and Finance ledger entry', async () => {
    const po = await purchasingService.createPurchaseOrder({
      supplierId: 'sup_1',
      supplierName: 'Imphal Fresh Agro',
      expectedDeliveryDate: new Date().toISOString(),
      createdBy: 'Owner',
      status: 'APPROVED',
      items: [
        {
          id: 'poi_1',
          productId: 'TOT-002', // Pork
          productName: 'Pork',
          quantity: 10,
          receivedQuantity: 0,
          unit: 'Kg',
          unitPrice: 340,
          totalPrice: 3400
        }
      ],
      subtotal: 3400,
      taxTotal: 0,
      grandTotal: 3400
    });

    const beforeItem = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-002');
    const beforeStock = Number(beforeItem?.currentStock || 0);

    await purchasingService.updatePurchaseOrderStatus(po.id, 'FULFILLED');

    const afterItem = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-002');
    expect(Number(afterItem?.currentStock || 0)).toBe(beforeStock + 10);

    const financeTxns = await financeService.getTransactions();
    expect(financeTxns.some(t => t.reference === po.poNumber && t.totalDebit === 3400)).toBe(true);
  });

  it('deducts recipe ingredients with portion multiplier on POS checkout and posts sales journal', async () => {
    // Seed TOT-001 (Boneless Chicken, Kg) with 10 Kg
    const existingChicken = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-001');
    await offlineDB.setDoc('inventory_items', 'TOT-001', {
      ...(existingChicken || {}),
      id: 'TOT-001',
      currentStock: 10,
      stockVerified: true
    } as InventoryItem, { syncToCloud: false });

    const chickenChow = INITIAL_MENU_ITEMS.find(p => p.id === 'prod_chow_chicken')!;
    usePosStore.setState({
      products: INITIAL_MENU_ITEMS,
      cart: [],
      discount: null,
      orderType: 'TAKEAWAY'
    });

    // Add 1 Large Chicken Chowmein (Large = 1.35x multiplier on 0.075 Kg chicken = 0.1013 Kg)
    usePosStore.getState().addToCart(chickenChow, 'Large', undefined, 1);

    const order = await usePosStore.getState().completeCheckout({
      method: 'CASH',
      details: { method: 'CASH', cashTendered: 200, changeDue: 89.75 }
    });

    expect(order.status).toBe('PAID');

    const chickenAfter = await offlineDB.getDoc<InventoryItem>('inventory_items', 'TOT-001');
    // 10 - (0.075 * 1.35 = 0.1013) = 9.8987
    expect(Number(chickenAfter?.currentStock)).toBeCloseTo(9.8987, 3);

    // Check finance journal was recorded
    const txns = await financeService.getTransactions();
    expect(txns.some(t => t.reference === order.orderNumber)).toBe(true);
  });

  it('exports, validates, and restores full JSON database backups', async () => {
    const backup = await offlineDB.exportBackupSnapshot();
    const validation = offlineDB.validateBackupSnapshot(backup);
    expect(validation.valid).toBe(true);
    expect(backup.collections.inventory_items).toHaveLength(144);

    await offlineDB.restoreBackupSnapshot(backup, { syncToCloud: false });
    const invAfterRestore = await offlineDB.getCollection('inventory_items');
    expect(invAfterRestore).toHaveLength(144);
  });
});
