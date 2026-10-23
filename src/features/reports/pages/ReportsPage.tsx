import React, { useState, useEffect } from 'react';
import { useReportsStore } from '../store/reportsStore';
import { ReportsDashboard } from '../components/ReportsDashboard';
import { LayoutDashboard, FileBarChart, PieChart, ShoppingBag, Users, Wallet, RefreshCw } from 'lucide-react';
import { posService } from '../../pos/services/posService';
import { inventoryService } from '../../inventory/services/inventoryService';
import { kdsService } from '../../kds/services/kdsService';
import { crmService } from '../../crm/services/crmService';
import { financeService } from '../../finance/services/financeService';
import { Order } from '../../pos/models/pos';
import { InventoryItem } from '../../inventory/models/inventory';
import { Ticket } from '../../kds/models/kds';
import { Customer } from '../../crm/models/crm';
import { Transaction } from '../../finance/models/finance';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'inventory' | 'kitchen' | 'crm' | 'finance'>('dashboard');
  const { loadReports, loading } = useReportsStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const refreshAll = async () => {
    await loadReports();
    const [o, i, t, c, f] = await Promise.all([
      posService.getOrders(),
      inventoryService.getItems(),
      kdsService.getTickets(),
      crmService.getCustomers(),
      financeService.getTransactions()
    ]);
    setOrders(o);
    setInventory(i);
    setTickets(t);
    setCustomers(c);
    setTransactions(f);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Sales & POS', icon: FileBarChart },
    { id: 'inventory', label: 'Inventory', icon: ShoppingBag },
    { id: 'kitchen', label: 'Kitchen', icon: PieChart },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'finance', label: 'Finance', icon: Wallet },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Real-time operational & financial intelligence from recorded restaurant data</p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Refresh Reports
        </button>
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
                  ${isActive 
                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'}
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
          {activeTab === 'dashboard' && <ReportsDashboard />}

          {activeTab === 'sales' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">POS Order Register ({orders.length} orders)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 font-semibold">Order #</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Payment</th>
                      <th className="p-4 font-semibold text-right">Subtotal</th>
                      <th className="p-4 font-semibold text-right">GST</th>
                      <th className="p-4 font-semibold text-right">Total (₹)</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td className="p-4 font-mono font-semibold">{o.orderNumber}</td>
                        <td className="p-4">{o.orderType}</td>
                        <td className="p-4">{o.paymentMethod}</td>
                        <td className="p-4 text-right">₹{o.subtotal.toFixed(2)}</td>
                        <td className="p-4 text-right">₹{o.tax.toFixed(2)}</td>
                        <td className="p-4 text-right font-bold">₹{o.total.toFixed(2)}</td>
                        <td className="p-4">{o.status}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-slate-500">No sales recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 dark:text-white">Master Inventory Valuation ({inventory.length} items)</h3>
              </div>
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-4 font-semibold">ID</th>
                      <th className="p-4 font-semibold">Item Name</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold text-right">Current Stock</th>
                      <th className="p-4 font-semibold text-right">Unit Cost (₹)</th>
                      <th className="p-4 font-semibold text-right">Total Value (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {inventory.map(item => (
                      <tr key={item.id}>
                        <td className="p-4 font-mono text-xs">{item.id}</td>
                        <td className="p-4 font-medium">{item.name}</td>
                        <td className="p-4 text-slate-500">{item.categoryName}</td>
                        <td className="p-4 text-right font-semibold">{item.currentStock} {item.unit}</td>
                        <td className="p-4 text-right">₹{(item.costPrice || 0).toFixed(2)}</td>
                        <td className="p-4 text-right font-bold">₹{((item.currentStock || 0) * (item.costPrice || 0)).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Kitchen Tickets ({tickets.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 font-semibold">Order #</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Items</th>
                      <th className="p-4 font-semibold">Status</th>
                      <th className="p-4 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {tickets.map(t => (
                      <tr key={t.id}>
                        <td className="p-4 font-mono font-semibold">{t.orderNumber}</td>
                        <td className="p-4">{t.type}</td>
                        <td className="p-4">{t.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}</td>
                        <td className="p-4 font-semibold">{t.status}</td>
                        <td className="p-4 text-slate-500">{new Date(t.createdAt).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {tickets.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">No kitchen tickets recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'crm' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Customer Loyalty Report ({customers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 font-semibold">Customer</th>
                      <th className="p-4 font-semibold">Phone</th>
                      <th className="p-4 font-semibold">Tier</th>
                      <th className="p-4 font-semibold text-right">Visits</th>
                      <th className="p-4 font-semibold text-right">Total Spent (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {customers.map(c => (
                      <tr key={c.id}>
                        <td className="p-4 font-medium">{c.firstName} {c.lastName}</td>
                        <td className="p-4">{c.phone}</td>
                        <td className="p-4">{c.tier}</td>
                        <td className="p-4 text-right">{c.totalVisits}</td>
                        <td className="p-4 text-right font-bold">₹{c.totalSpent.toFixed(2)}</td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">No customer records yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Financial Ledger Entries ({transactions.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Reference</th>
                      <th className="p-4 font-semibold">Description</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td className="p-4">{new Date(t.date).toLocaleDateString('en-IN')}</td>
                        <td className="p-4 font-mono">{t.reference}</td>
                        <td className="p-4">{t.description}</td>
                        <td className="p-4">{t.status}</td>
                        <td className="p-4 text-right font-bold">₹{t.totalDebit.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-slate-500">No financial transactions recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
