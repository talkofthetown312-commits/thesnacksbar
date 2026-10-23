import { collection, query, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { Account, Transaction, TransactionLine } from '../models/finance';
import { db, auth } from '../../../core/firebase/firebaseConfig';
import { offlineDB, DEFAULT_ACCOUNTS } from '../../../core/offline/db';

class FinanceService {
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await offlineDB.initializeTalkOSDatabase({ syncToCloud: false });
      this.initialized = true;
    }
  }

  async getAccounts(): Promise<Account[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Account>('finance_accounts');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'finance_accounts')));
        if (!snapshot.empty) {
          const merged = new Map<string, Account>();
          for (const a of local) merged.set(a.id, a);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Account);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('finance_accounts', list);
          return list.sort((a, b) => a.code.localeCompare(b.code));
        }
      } catch {
        // Offline fallback
      }
    }
    const result = local.length > 0 ? local : (DEFAULT_ACCOUNTS as Account[]);
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }

  async addAccount(accountData: Omit<Account, 'id'>): Promise<Account> {
    await this.ensureInitialized();
    const newAccount: Account = {
      ...accountData,
      id: `acc_${Date.now()}`
    };
    await offlineDB.setDoc('finance_accounts', newAccount.id, newAccount);
    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'finance_accounts', newAccount.id), newAccount);
      } catch {
        // Queued via offlineDB
      }
    }
    return newAccount;
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<void> {
    await this.ensureInitialized();
    await offlineDB.updateDoc<Account>('finance_accounts', id, data);
    if (db && auth?.currentUser) {
      try {
        await updateDoc(doc(db, 'finance_accounts', id), data);
      } catch {
        // Queued via offlineDB
      }
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    await this.ensureInitialized();
    const local = await offlineDB.getCollection<Transaction>('finance_transactions');
    if (db && auth?.currentUser) {
      try {
        const snapshot = await getDocs(query(collection(db, 'finance_transactions')));
        if (!snapshot.empty) {
          const merged = new Map<string, Transaction>();
          for (const t of local) merged.set(t.id, t);
          for (const d of snapshot.docs) {
            merged.set(d.id, { id: d.id, ...d.data() } as Transaction);
          }
          const list = Array.from(merged.values());
          await offlineDB.replaceCollectionLocal('finance_transactions', list);
          return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
      } catch {
        // Offline fallback
      }
    }
    return local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createTransaction(transactionData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }): Promise<Transaction> {
    await this.ensureInitialized();
    const id = transactionData.id || `ftxn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const existing = await offlineDB.getDoc<Transaction>('finance_transactions', id);
    if (existing) return existing;

    const newTxn: Transaction = {
      ...transactionData,
      id,
      createdAt: new Date().toISOString()
    };

    await offlineDB.setDoc('finance_transactions', newTxn.id, newTxn);

    // Update account balances when transaction is POSTED
    if (newTxn.status === 'POSTED' && Array.isArray(newTxn.lines)) {
      const accounts = await this.getAccounts();
      for (const line of newTxn.lines) {
        const acc = accounts.find(a => a.id === line.accountId || a.code === line.accountId);
        if (acc) {
          const isDebitNormal = acc.type === 'ASSET' || acc.type === 'EXPENSE';
          const delta = isDebitNormal
            ? (line.debit || 0) - (line.credit || 0)
            : (line.credit || 0) - (line.debit || 0);
          const nextBalance = Math.round(((acc.balance || 0) + delta) * 100) / 100;
          await offlineDB.updateDoc<Account>('finance_accounts', acc.id, { balance: nextBalance });
        }
      }
    }

    if (db && auth?.currentUser) {
      try {
        await setDoc(doc(db, 'finance_transactions', newTxn.id), newTxn);
      } catch {
        // Queued via offlineDB
      }
    }
    return newTxn;
  }

  async recordPosSaleJournal(order: {
    id: string;
    orderNumber: string;
    total: number;
    subtotal: number;
    discountAmount?: number;
    tax: number;
    totalCost?: number;
    paymentMethod: string;
    createdAt: string;
  }): Promise<void> {
    const netSales = Math.max(0, order.subtotal - (order.discountAmount || 0));
    const assetAccountId = order.paymentMethod === 'CASH' ? 'acc_cash' : 'acc_bank';
    const assetAccountName = order.paymentMethod === 'CASH' ? 'Cash on Hand / Register' : 'Bank / UPI Settlement Account';

    const lines: TransactionLine[] = [
      {
        id: `ln_${order.id}_1`,
        accountId: assetAccountId,
        accountName: assetAccountName,
        description: `POS Sale ${order.orderNumber} (${order.paymentMethod})`,
        debit: order.total,
        credit: 0
      },
      {
        id: `ln_${order.id}_2`,
        accountId: 'acc_sales',
        accountName: 'Food & Beverage Sales Revenue',
        description: `Net Food Revenue ${order.orderNumber}`,
        debit: 0,
        credit: netSales
      }
    ];

    if (order.tax > 0) {
      lines.push({
        id: `ln_${order.id}_3`,
        accountId: 'acc_gst',
        accountName: 'GST Payable (CGST + SGST)',
        description: `GST on ${order.orderNumber}`,
        debit: 0,
        credit: order.tax
      });
    }

    if (order.totalCost && order.totalCost > 0) {
      lines.push(
        {
          id: `ln_${order.id}_4`,
          accountId: 'acc_cogs',
          accountName: 'Cost of Goods Sold (Ingredients & Packaging)',
          description: `Recipe COGS for ${order.orderNumber}`,
          debit: order.totalCost,
          credit: 0
        },
        {
          id: `ln_${order.id}_5`,
          accountId: 'acc_inventory',
          accountName: 'Kitchen & Packaging Inventory',
          description: `Inventory relief for ${order.orderNumber}`,
          debit: 0,
          credit: order.totalCost
        }
      );
    }

    const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100;
    const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100;

    await this.createTransaction({
      id: `ftxn_sale_${order.id}`,
      date: order.createdAt,
      reference: order.orderNumber,
      description: `POS Order ${order.orderNumber} (${order.paymentMethod})`,
      status: 'POSTED',
      lines,
      totalDebit,
      totalCredit,
      createdBy: 'POS Terminal'
    });
  }
}

export const financeService = new FinanceService();
