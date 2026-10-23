import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, mapMasterRecordToInventoryItem } from '../../../core/offline/db';
import { MASTER_INVENTORY } from '../data/masterInventory';
import { APPROVED_STAGED_RECIPES } from '../../manufacturing/data/masterRecipes';
import { validateInventoryStaging, type StagedInventoryItem, type StagedRecipe } from './inventoryStaging';
import { InventoryItem } from '../models/inventory';

/**
 * Owner-reviewed staging import. Never changes live stock, existing inventory
 * records or production recipes. Works offline-first and synchronizes to Firestore when authorized.
 */
export async function importInventoryStaging(
  catalogue: StagedInventoryItem[],
  recipes: StagedRecipe[] = [],
  confirmed: boolean
): Promise<{ imported: number; skipped: number; recipesStaged: number }> {
  if (!confirmed) throw new Error('Explicit owner confirmation is required');
  if (catalogue.length !== 144 || (recipes.length !== 0 && recipes.length !== 14)) {
    throw new Error('Expected complete 144-item catalogue and either zero or 14 approved recipe drafts');
  }
  const report = validateInventoryStaging(catalogue, recipes);
  if (recipes.length === 0) report.issues = report.issues.filter(issue => !issue.startsWith('Expected 14 approved recipes'));
  if (new Set(catalogue.map(item => item.id)).size !== 144) throw new Error('Duplicate catalogue identifiers');
  if (report.issues.length) throw new Error(report.issues.slice(0, 10).join('; '));

  const existingLocal = await offlineDB.getCollection<InventoryItem>('inventory_items');
  const existingIds = new Set(existingLocal.map(d => d.id));

  if (db && auth?.currentUser) {
    try {
      const existingRemote = await getDocs(collection(db, 'inventory_items'));
      existingRemote.docs.forEach(d => existingIds.add(d.id));
    } catch {
      // Proceed with local IDs
    }
  }

  const pending = catalogue.filter(item => !existingIds.has(item.id));
  const now = new Date().toISOString();

  // Save missing items locally and enqueue for cloud sync without overwriting existing items
  for (const item of pending) {
    const newItem = mapMasterRecordToInventoryItem(item);
    await offlineDB.setDoc('inventory_items', item.id, newItem);
  }

  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i];
    const docId = `approved_${String(i + 1).padStart(2, '0')}`;
    await offlineDB.setDoc('inventory_recipe_staging', docId, {
      id: docId,
      ...recipe,
      stockDeductionReady: false,
      importedAt: now,
      source: 'Talk of the Town Cost Calculator (approved menu only)'
    });
  }

  if (db && auth?.currentUser) {
    try {
      const batch = writeBatch(db);
      for (const item of pending) {
        const mapped = mapMasterRecordToInventoryItem(item);
        batch.set(doc(db, 'inventory_items', item.id), mapped);
      }
      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];
        batch.set(doc(db, 'inventory_recipe_staging', `approved_${String(i + 1).padStart(2, '0')}`), {
          ...recipe,
          stockDeductionReady: false,
          importedAt: now,
          source: 'Talk of the Town Cost Calculator (approved menu only)'
        });
      }
      await batch.commit();
    } catch {
      // Queued in offlineDB sync outbox
    }
  }

  return { imported: pending.length, skipped: catalogue.length - pending.length, recipesStaged: recipes.length };
}

/** Explicit catalogue + approved 14 recipe staging import, with no live stock changes. */
export function importMasterInventory(confirmed: boolean) {
  return importInventoryStaging(MASTER_INVENTORY, APPROVED_STAGED_RECIPES, confirmed);
}
