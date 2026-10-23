import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { FinanceDashboard } from '../components/FinanceDashboard';
import { AccountsList } from '../components/AccountsList';
import { TransactionsList } from '../components/TransactionsList';
import { LayoutDashboard, BookOpen, Receipt, FileText } from 'lucide-react';

export function FinancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'accounts' | 'transactions' | 'reports'>('dashboard');
  const [reportType, setReportType] = useState<'PNL' | 'BS' | 'TB'>('PNL');
  const { loadAccounts, loadTransactions, accounts, loading } = useFinanceStore();

  useEffect(() => {
    loadAccounts();
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'accounts', label: 'Chart of Accounts', icon: BookOpen },
    { id: 'transactions', label: 'Journal Entries', icon: Receipt },
    { id: 'reports', label: 'Financial Reports', icon: FileText }
  ] as const;

  const revenueAccounts = accounts.filter(a => a.type === 'INCOME');
  const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE');
  const assetAccounts = accounts.filter(a => a.type === 'ASSET');
  const liabilityAccounts = accounts.filter(a => a.type === 'LIABILITY');
  const equityAccounts = accounts.filter(a => a.type === 'EQUITY');

  const totalRevenue = revenueAccounts.reduce((s, a) => s + a.balance, 0);
  const totalExpense = expenseAccounts.reduce((s, a) => s + a.balance, 0);
  const netProfit = totalRevenue - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finance &amp; Accounting</h1>
          <p className="text-slate-500 mt-1">Manage accounts, journal entries, and financial statements</p>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors cursor-pointer
                  ${
                    isActive
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loading && activeTab === 'dashboard' ? (
        <div className="flex items-center justify-center h-64 text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="py-2">
          {activeTab === 'dashboard' && <FinanceDashboard />}
          {activeTab === 'accounts' && <AccountsList />}
          {activeTab === 'transactions' && <TransactionsList />}
          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setReportType('PNL')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${
                    reportType === 'PNL'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Profit &amp; Loss Statement
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('BS')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${
                    reportType === 'BS'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Balance Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setReportType('TB')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer ${
                    reportType === 'TB'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Trial Balance
                </button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6">
                {reportType === 'PNL' && (
                  <>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-3">
                      Talk of the Town — Profit &amp; Loss Statement
                    </h3>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-emerald-600">Revenue / Income</p>
                      {revenueAccounts.map(a => (
                        <div key={a.id} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                          <span>{a.code} — {a.name}</span>
                          <span className="font-bold">₹{a.balance.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1">
                        <span>Total Revenue</span>
                        <span>₹{totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-rose-600">Cost of Sales &amp; Operating Expenses</p>
                      {expenseAccounts.map(a => (
                        <div key={a.id} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                          <span>{a.code} — {a.name}</span>
                          <span className="font-bold">₹{a.balance.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-slate-900 dark:text-white pt-1">
                        <span>Total Expenses</span>
                        <span>₹{totalExpense.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-base font-black pt-3 border-t-2 border-slate-200 dark:border-slate-700">
                      <span>Net Profit / (Loss)</span>
                      <span className={netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>₹{netProfit.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {reportType === 'BS' && (
                  <>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-3">
                      Talk of the Town — Balance Sheet
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-indigo-600">Assets</p>
                        {assetAccounts.map(a => (
                          <div key={a.id} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                            <span>{a.code} — {a.name}</span>
                            <span className="font-bold">₹{a.balance.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold pt-2">
                          <span>Total Assets</span>
                          <span>₹{assetAccounts.reduce((s, a) => s + a.balance, 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase text-amber-600">Liabilities &amp; Equity</p>
                        {[...liabilityAccounts, ...equityAccounts].map(a => (
                          <div key={a.id} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                            <span>{a.code} — {a.name}</span>
                            <span className="font-bold">₹{a.balance.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-slate-800">
                          <span>Current Period Net Earnings</span>
                          <span className="font-bold">₹{netProfit.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {reportType === 'TB' && (
                  <>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b pb-3">
                      Talk of the Town — Trial Balance
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2">Code</th>
                          <th className="py-2">Account</th>
                          <th className="py-2">Type</th>
                          <th className="py-2 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accounts.map(a => (
                          <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="py-2 font-mono">{a.code}</td>
                            <td className="py-2 font-medium">{a.name}</td>
                            <td className="py-2 text-slate-500">{a.type}</td>
                            <td className="py-2 text-right font-bold">₹{a.balance.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
