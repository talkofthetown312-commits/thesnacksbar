import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Customer, Promotion } from '../models/crm';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB } from '../../../core/offline/db';

class CrmService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getCustomers(): Promise<Customer[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Customer>('customers');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'customers')));
        if (!snapshot.empty) {
          const merged = new Map<string, Customer>();
          for (const c of local) merged.set(c.id, c);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Customer);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('customers', list);
          return list;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async getPromotions(): Promise<Promotion[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Promotion>('promotions');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'promotions')));
        if (!snapshot.empty) {
          const merged = new Map<string, Promotion>();
          for (const p of local) merged.set(p.id, p);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Promotion);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('promotions', list);
          return list;
        }
      } catch {
        // Offline fallback
      }
    }
    return local;
  }

  async addCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'tier' | 'status' | 'totalVisits' | 'totalSpent'>): Promise<Customer> {
    await this.ensureInitialized();
    const newCustomer: Customer = {
      ...customerData,
      id: `cust_${Date.now()}`,
      createdAt: new Date().toISOString(),
      loyaltyPoints: 0,
      tier: 'BRONZE',
      status: 'ACTIVE',
      totalVisits: 0,
      totalSpent: 0
    };
    await offlineDB.setDoc('customers', newCustomer.id, newCustomer);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'customers', newCustomer.id), newCustomer);
      } catch {
        // Queued via offlineDB
      }
    }
    return newCustomer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Customer>('customers', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'customers', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('customers', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async addPromotion(promotionData: Omit<Promotion, 'id' | 'timesUsed'>): Promise<Promotion> {
    await this.ensureInitialized();
    const newPromo: Promotion = {
      ...promotionData,
      id: `promo_${Date.now()}`,
      timesUsed: 0
    };
    await offlineDB.setDoc('promotions', newPromo.id, newPromo);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'promotions', newPromo.id), newPromo);
      } catch {
        // Queued via offlineDB
      }
    }
    return newPromo;
  }

  async updatePromotion(id: string, data: Partial<Promotion>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Promotion>('promotions', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'promotions', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deletePromotion(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('promotions', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'promotions', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }
}

export const crmService = new CrmService();
