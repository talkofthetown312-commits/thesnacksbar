import { collection, query, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User, Branch, SystemConfig, AuditLog } from '../models/admin';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, DEFAULT_BRANCHES, DEFAULT_STAFF_PROFILES } from '../../../core/offline/db';

class AdminService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getUsers(): Promise<User[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<User>('admin_users');
    const merged = new Map<string, User>();

    for (const u of DEFAULT_STAFF_PROFILES as unknown as User[]) {
      merged.set(u.id, u);
    }
    for (const u of local) {
      merged.set(u.id, u);
    }

    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'admin_users')));
        for (const d of snapshot.docs) {
          const remote = { id: d.id, ...d.data() } as User;
          const existing = merged.get(d.id);
          merged.set(d.id, { ...existing, ...remote, pin: remote.pin || existing?.pin });
        }
        await offlineDB.replaceCollectionLocal('admin_users', Array.from(merged.values()));
      } catch {
        // Offline or non-admin fallback
      }
    }

    return Array.from(merged.values());
  }

  async getBranches(): Promise<Branch[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Branch>('admin_branches');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'admin_branches')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
          await offlineDB.replaceCollectionLocal('admin_branches', remote);
          return remote;
        }
      } catch {
        // Offline fallback
      }
    }
    return local.length > 0 ? local : DEFAULT_BRANCHES;
  }

  async getSystemConfig(): Promise<SystemConfig> {
    await this.ensureInitialized();
    const local = await offlineDB.getDoc<SystemConfig>('admin_config', 'settings');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'admin_config')));
        if (!snapshot.empty) {
          const remote = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SystemConfig;
          await offlineDB.setDoc('admin_config', 'settings', { ...local, ...remote, id: 'settings' }, { syncToCloud: false });
          return { ...local, ...remote };
        }
      } catch {
        // Offline fallback
      }
    }
    if (local) {
      return {
        id: local.id || 'settings',
        companyName: local.companyName || 'Talk of the Town',
        defaultCurrency: local.defaultCurrency || 'INR',
        taxType: local.taxType || 'GST',
        dateFormat: local.dateFormat || 'DD/MM/YYYY',
        timeFormat: local.timeFormat || '24h',
        timezone: local.timezone || 'Asia/Kolkata',
        taxRate: local.taxRate ?? 5,
        receiptFooter: local.receiptFooter || 'Thank you for dining at Talk of the Town!',
        defaultStaffPin: local.defaultStaffPin || '1234'
      };
    }
    return {
      id: 'settings',
      companyName: 'Talk of the Town',
      defaultCurrency: 'INR',
      taxType: 'GST',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      timezone: 'Asia/Kolkata',
      taxRate: 5,
      receiptFooter: 'Thank you for dining at Talk of the Town!',
      defaultStaffPin: '1234'
    };
  }

  async updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    await this.ensureInitialized();
    const current = await this.getSystemConfig();
    const updated: SystemConfig = { ...current, ...config, id: 'settings' };
    await offlineDB.setDoc('admin_config', 'settings', updated);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'admin_config', 'settings'), updated, { merge: true });
      } catch {
        // Queued via offlineDB
      }
    }
    return updated;
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<AuditLog>('admin_audit_logs');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'admin_audit_logs')));
        if (!snapshot.empty) {
          const remote = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuditLog));
          await offlineDB.replaceCollectionLocal('admin_audit_logs', remote);
          return remote.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch {
        // Offline fallback
      }
    }
    return local.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async recordAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    await this.ensureInitialized();
    const log: AuditLog = {
      ...entry,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    await offlineDB.setDoc('admin_audit_logs', log.id, log);
    return log;
  }

  async addUser(userData: Omit<User, 'id'> & { id?: string }): Promise<User> {
    await this.ensureInitialized();
    const newUser: User = {
      ...userData,
      id: userData.id?.trim() || `usr_${Date.now()}`
    };
    await offlineDB.setDoc('admin_users', newUser.id, newUser);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'admin_users', newUser.id), newUser);
      } catch {
        // Queued via offlineDB
      }
    }
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<User>('admin_users', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'admin_users', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('admin_users', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'admin_users', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async addBranch(branchData: Omit<Branch, 'id'>): Promise<Branch> {
    await this.ensureInitialized();
    const newBranch: Branch = {
      ...branchData,
      id: `br_${Date.now()}`
    };
    await offlineDB.setDoc('admin_branches', newBranch.id, newBranch);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'admin_branches', newBranch.id), newBranch);
      } catch {
        // Queued via offlineDB
      }
    }
    return newBranch;
  }

  async updateBranch(id: string, data: Partial<Branch>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Branch>('admin_branches', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'admin_branches', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async deleteBranch(id: string): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.deleteDoc('admin_branches', id);
    if (db && auth?.currentUser) {
      try {
        await deleteDoc(doc(db, 'admin_branches', id));
      } catch {
        // Queued via offlineDB
      }
    }
  }
}

export const adminService = new AdminService();
