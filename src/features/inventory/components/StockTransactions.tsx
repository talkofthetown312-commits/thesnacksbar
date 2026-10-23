import React, { useState, useMemo } from 'react';
import { useInventoryStore } from '../store/inventoryStore';
import { ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Plus, FileText, Search } from 'lucide-react';
import { TransactionForm } from './TransactionForm';

export function StockTransactions() {
  const { items, transactions } = useInventoryStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const itemMap = useMemo(() => {
    const map = new Map<string, { name: string; unit: string }>();
    for (const item of items) {
      map.set(item.id, { name: item.name, unit: item.unit });
    }
    return map;
  }, [items]);

  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(txn => {
      const itemInfo = itemMap.get(txn.itemId);
      return (
        txn.itemId.toLowerCase().includes(q) ||
        (itemInfo?.name || '').toLowerCase().includes(q) ||
        txn.type.toLowerCase().includes(q) ||
        (txn.referenceId || '').toLowerCase().includes(q) ||
        (txn.notes || '').toLowerCase().includes(q)
      );
    });
  }, [transactions, searchTerm, itemMap]);

  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Item ID', 'Item Name', 'Quantity', 'Unit', 'Unit Cost (INR)', 'Total Cost (INR)', 'Reference', 'Notes', 'Performed By'];
    const rows = filteredTransactions.map(t => {
      const info = itemMap.get(t.itemId);
      return [
        t.date,
        t.type,
        t.itemId,
        `"${(info?.name || t.itemId).replace(/"/g, '""')}"`,
        t.quantity,
        info?.unit || '',
        t.unitCost || 0,
        t.totalCost || 0,
        `"${(t.referenceId || '').replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
        `"${(t.performedBy || '').replace(/"/g, '""')}"`
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `talkos-stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 justify-between items-center bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Stock Movements &amp; Deductions</h2>
          <p className="text-xs text-slate-500">Live ledger of POS recipe deductions, Purchase Order receipts, and stock adjustments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter movements..."
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Record Transaction
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date &amp; Time</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Item</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Quantity</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Value (₹)</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reference / Notes</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">By</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                  <ArrowRightLeft className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-1">No stock movements recorded yet</p>
                  <p>Completed POS orders, received Purchase Orders, and manual stock adjustments appear here automatically.</p>
                </td>
              </tr>
            ) : (
              filteredTransactions.map(txn => {
                const info = itemMap.get(txn.itemId);
                const isInbound = txn.type === 'STOCK_IN' || txn.type === 'RETURN' || txn.type === 'OPENING';
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {new Date(txn.date).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isInbound
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                        }`}
                      >
                        {isInbound ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">
                      <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 mr-1.5">{txn.itemId}</span>
                      {info?.name || txn.itemId}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-right font-bold ${isInbound ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isInbound ? '+' : '-'}
                      {Number(txn.quantity).toFixed(3).replace(/\.?0+$/, '')} {info?.unit || ''}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-slate-700 dark:text-slate-300">
                      ₹{(txn.totalCost || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={txn.notes || txn.referenceId}>
                      {txn.notes || txn.referenceId || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      {txn.performedBy}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && <TransactionForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
