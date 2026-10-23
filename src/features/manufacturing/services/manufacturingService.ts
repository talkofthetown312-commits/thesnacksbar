import { collection, query, getDocs, doc, setDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB } from '../../../core/offline/db';
import { Recipe, ProductionOrder } from '../models/manufacturing';
import { MASTER_RECIPES } from '../data/masterRecipes';
import { inventoryService } from '../../inventory/services/inventoryService';

class ManufacturingService {
  private recipesCollection = 'manufacturing_recipes';
  private ordersCollection = 'manufacturing_orders';
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getRecipes(): Promise<Recipe[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Recipe>(this.recipesCollection);
    const merged = new Map<string, Recipe>();

    for (const r of MASTER_RECIPES) {
      merged.set(r.id, r);
    }
    for (const r of local) {
      if (r.name === 'Classic Burger Patty') continue;
      merged.set(r.id, r);
    }

    if (db) {
      try {
        const q = query(collection(db, this.recipesCollection), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          const remote = { id: d.id, ...d.data() } as Recipe;
          if (remote.name === 'Classic Burger Patty') continue;
          merged.set(remote.id, remote);
        }
        await offlineDB.replaceCollectionLocal(this.recipesCollection, Array.from(merged.values()));
      } catch {
        // Offline or unauthenticated fallback
      }
    }

    return Array.from(merged.values());
  }

  async getProductionOrders(): Promise<ProductionOrder[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<ProductionOrder>(this.ordersCollection);
    const merged = new Map<string, ProductionOrder>();
    for (const o of local) {
      if (o.recipeName === 'Classic Burger Patty') continue;
      merged.set(o.id, o);
    }

    if (db && auth?.currentUser) {
      try {
        const q = query(collection(db, this.ordersCollection), orderBy('updatedAt', 'desc'));
        const snapshot = await getDocs(q);
        for (const d of snapshot.docs) {
          const remote = { id: d.id, ...d.data() } as ProductionOrder;
          if (remote.recipeName === 'Classic Burger Patty') continue;
          merged.set(remote.id, remote);
        }
        await offlineDB.replaceCollectionLocal(this.ordersCollection, Array.from(merged.values()));
      } catch {
        // Offline fallback
      }
    }

    return Array.from(merged.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async addRecipe(data: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>): Promise<Recipe> {
    await this.ensureInitialized();
    const id = `rec_${Date.now()}`;
    const now = new Date().toISOString();
    const newRecipe: Recipe = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    await offlineDB.setDoc(this.recipesCollection, id, newRecipe);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, this.recipesCollection, id), newRecipe);
      } catch {
        // Handled by offlineDB outbox
      }
    }
    return newRecipe;
  }

  async updateRecipe(id: string, data: Partial<Recipe>): Promise<void> {
    await this.ensureInitialized();
    const updatedAt = new Date().toISOString();
    await offlineDB.updateDoc<Recipe>(this.recipesCollection, id, { ...data, updatedAt });
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, this.recipesCollection, id), { ...data, updatedAt });
      } catch {
        // Handled by offlineDB outbox
      }
    }
  }

  async addProductionOrder(data: Omit<ProductionOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    await this.ensureInitialized();
    const id = `po_${Date.now()}`;
    const now = new Date().toISOString();
    const newOrder: ProductionOrder = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now
    };

    await offlineDB.setDoc(this.ordersCollection, id, newOrder);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, this.ordersCollection, id), newOrder);
      } catch {
        // Handled by offlineDB outbox
      }
    }
    return newOrder;
  }

  async updateProductionOrder(id: string, data: Partial<ProductionOrder>): Promise<void> {
    await this.ensureInitialized();
    const existing = await offlineDB.getDoc<ProductionOrder>(this.ordersCollection, id);
    const updatedAt = new Date().toISOString();
    await offlineDB.updateDoc<ProductionOrder>(this.ordersCollection, id, { ...data, updatedAt });

    // If production order transitions to COMPLETED, deduct recipe ingredients automatically
    if (data.status === 'COMPLETED' && existing && existing.status !== 'COMPLETED') {
      const recipes = await this.getRecipes();
      const recipe = recipes.find(r => r.id === existing.recipeId);
      if (recipe) {
        const yieldQty = recipe.yieldQuantity || 1;
        const ratio = (data.actualQuantity || existing.plannedQuantity || 1) / yieldQty;
        for (const [idx, ing] of recipe.ingredients.entries()) {
          if (ing.inventoryItemId) {
            const qty = ing.quantity * ratio;
            await inventoryService.recordTransaction({
              idempotencyKey: `prod_${id}_${idx}`,
              itemId: ing.inventoryItemId,
              type: 'STOCK_OUT',
              quantity: qty,
              referenceId: id,
              notes: `Kitchen Prep Batch (${existing.batchNumber}): ${recipe.name}`,
              unitCost: ing.costPerUnit || 0,
              totalCost: (ing.costPerUnit || 0) * qty,
              performedBy: 'Kitchen Prep'
            }).catch(() => {});
          }
        }
      }
    }

    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, this.ordersCollection, id), { ...data, updatedAt });
      } catch {
        // Handled by offlineDB outbox
      }
    }
  }
}

export const manufacturingService = new ManufacturingService();
