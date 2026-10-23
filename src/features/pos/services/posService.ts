import { collection, query, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB } from '../../../core/offline/db';
import { Product, Order, MenuItemSize } from '../models/pos';
import { INITIAL_MENU_ITEMS, getAllMenuItemSizes } from '../data/menuData';
import { visibleCustomerProducts, sizesForCustomerProduct, validateCustomerProduct } from './customerCatalogue';

class PosService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getAllProducts(): Promise<Product[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Product>('pos_products');
    const merged = new Map<string, Product>();

    for (const item of INITIAL_MENU_ITEMS) {
      merged.set(item.id, item);
    }
    for (const item of local) {
      const initialMatch = INITIAL_MENU_ITEMS.find(m => m.id === item.id);
      merged.set(item.id, {
        ...initialMatch,
        ...item,
        recipeId: item.recipeId || initialMatch?.recipeId
      });
    }

    if (db) {
      try {
        const snapshot = await getDocs(query(collection(db, 'pos_products')));
        if (!snapshot.empty) {
          for (const record of snapshot.docs) {
            const remote = { ...record.data(), id: record.id } as Product;
            const initialMatch = INITIAL_MENU_ITEMS.find(m => m.id === remote.id);
            merged.set(remote.id, {
              ...initialMatch,
              ...remote,
              recipeId: remote.recipeId || initialMatch?.recipeId
            });
          }
          await offlineDB.replaceCollectionLocal('pos_products', Array.from(merged.values()));
        }
      } catch {
        // Offline or rules restriction — serve persistent local menu
      }
    }

    return Array.from(merged.values());
  }

  async getProducts(): Promise<Product[]> {
    return visibleCustomerProducts(await this.getAllProducts());
  }

  async syncInitialMenu(isCollectionEmpty = false): Promise<void> {
    await this.ensureInitialized();
    if (!db || !auth?.currentUser || !isCollectionEmpty) return;

    try {
      const existing = await getDocs(query(collection(db, 'pos_products')));
      if (!existing.empty) return;
      for (const item of INITIAL_MENU_ITEMS) {
        await setDoc(doc(db, 'pos_products', item.id), item, { merge: true });
      }
      const allSizes = getAllMenuItemSizes();
      for (const size of allSizes) {
        const sizeDocId = size.id || `${size.item_id}_${size.size.toLowerCase()}`;
        await setDoc(doc(db, 'menu_item_sizes', sizeDocId), size, { merge: true });
      }
    } catch (err) {
      console.warn('Could not sync menu items to Firestore:', err);
    }
  }

  async getMenuItemSizes(itemId?: string): Promise<MenuItemSize[]> {
    const products = await this.getAllProducts();
    const sizes = products.flatMap(sizesForCustomerProduct);
    return itemId ? sizes.filter(size => size.item_id === itemId) : sizes;
  }

  async addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
    await this.ensureInitialized();
    validateCustomerProduct({ ...productData, id: 'new' });
    const id = `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newProduct: Product = {
      ...productData,
      id,
      sizes: productData.sizes.map(size => ({ ...size, item_id: id }))
    };

    await offlineDB.setDoc('pos_products', id, newProduct);
    for (const size of newProduct.sizes) {
      const sizeId = `${id}_${size.size.toLowerCase()}`;
      await offlineDB.setDoc('menu_item_sizes', sizeId, { ...size, id: sizeId, item_id: id });
    }

    if (db && auth?.currentUser) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'pos_products', id), newProduct);
        for (const size of newProduct.sizes) {
          const sizeId = `${id}_${size.size.toLowerCase()}`;
          batch.set(doc(db, 'menu_item_sizes', sizeId), { ...size, id: sizeId });
        }
        await batch.commit();
      } catch {
        // Queued via offlineDB outbox
      }
    }
    return newProduct;
  }

  async updateProduct(product: Product): Promise<void> {
    await this.ensureInitialized();
    validateCustomerProduct(product);

    await offlineDB.setDoc('pos_products', product.id, product);
    for (const size of product.sizes) {
      const sizeId = `${product.id}_${size.size.toLowerCase()}`;
      await offlineDB.setDoc('menu_item_sizes', sizeId, { ...size, id: sizeId, item_id: product.id });
    }

    if (db && auth?.currentUser) {
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, 'pos_products', product.id), product);
        for (const size of product.sizes) {
          const sizeId = `${product.id}_${size.size.toLowerCase()}`;
          batch.set(doc(db, 'menu_item_sizes', sizeId), { ...size, id: sizeId, item_id: product.id });
        }
        await batch.commit();
      } catch {
        // Queued via offlineDB outbox
      }
    }
  }

  async setProductAvailability(productId: string, available: boolean): Promise<void> {
    await this.ensureInitialized();
    if (!productId.trim()) throw new Error('Missing product ID.');
    await offlineDB.updateDoc<Product>('pos_products', productId, { isAvailable: available });
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'pos_products', productId), { isAvailable: available });
      } catch {
        // Queued via offlineDB outbox
      }
    }
  }

  async getOrders(): Promise<Order[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Order>('pos_orders');
    const merged = new Map<string, Order>();
    for (const o of local) {
      merged.set(o.id, o);
    }

    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'pos_orders')));
        for (const record of snapshot.docs) {
          merged.set(record.id, { ...record.data(), id: record.id } as Order);
        }
        await offlineDB.replaceCollectionLocal('pos_orders', Array.from(merged.values()));
      } catch {
        // Offline or PIN-only mode — return local orders
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async updateOrderStatus(orderId: string, status: Order['status'], voidReason?: string): Promise<void> {
    await this.ensureInitialized();
    const updates: Partial<Order> & { updatedAt: string } = {
      status,
      ...(voidReason ? { voidReason } : {}),
      updatedAt: new Date().toISOString()
    };
    await offlineDB.updateDoc<Order>('pos_orders', orderId, updates);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'pos_orders', orderId), updates);
      } catch {
        // Queued via offlineDB outbox
      }
    }
  }

  async createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'orderNumber'>): Promise<Order> {
    await this.ensureInitialized();
    const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const suffix = id.replace(/^ord_/, '').slice(-6).toUpperCase();
    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber: `ORD-${suffix}`,
      createdAt: new Date().toISOString()
    };
    const cleanOrder = JSON.parse(JSON.stringify(newOrder)) as Order;

    // 1. Persist immediately to local database and enqueue cloud sync
    await offlineDB.setDoc('pos_orders', id, cleanOrder);

    // 2. If online and authenticated in Firebase, also write immediately
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'pos_orders', id), cleanOrder);
      } catch {
        // Queued in offlineDB sync outbox
      }
    }

    return cleanOrder;
  }
}

export const posService = new PosService();
