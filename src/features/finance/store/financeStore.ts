import { create } from 'zustand';
import { Account, Transaction } from '../models/finance';
import { financeService } from '../services/financeService';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  loadAccounts: () => Promise<void>;
  loadTransactions: () => Promise<void>;
  addAccount: (account: Omit<Account, 'id'>) => Promise<Account>;
  createTransaction: (txn: Omit<Transaction, 'id' | 'createdAt'>) => Promise<Transaction>;
}

export const useFinanceStore = create<FinanceState>((set) => ({
  accounts: [],
  transactions: [],
  loading: false,
  error: null,

  loadAccounts: async () => {
    set({ loading: true, error: null });
    try {
      const accounts = await financeService.getAccounts();
      set({ accounts, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  loadTransactions: async () => {
    set({ loading: true, error: null });
    try {
      const transactions = await financeService.getTransactions();
      set({ transactions, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  addAccount: async (accountData) => {
    try {
      const newAcc = await financeService.addAccount(accountData);
      const accounts = await financeService.getAccounts();
      set({ accounts });
      return newAcc;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  },

  createTransaction: async (txnData) => {
    try {
      const newTxn = await financeService.createTransaction(txnData);
      const [accounts, transactions] = await Promise.all([
        financeService.getAccounts(),
        financeService.getTransactions()
      ]);
      set({ accounts, transactions });
      return newTxn;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    }
  }
}));
