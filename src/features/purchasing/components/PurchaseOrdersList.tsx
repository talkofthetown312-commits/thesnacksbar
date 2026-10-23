import React, { useState, useMemo, useEffect } from 'react';
import { usePurchasingStore } from '../store/purchasingStore';
import { useInventoryStore } from '../../inventory/store/inventoryStore';
import { Search, Plus, FileText, CheckCircle2, Truck, X, Trash2 } from 'lucide-react';

export function PurchaseOrdersList() {
  const { purchaseOrders, suppliers, createPO, updatePOStatus, deletePO } = usePurchasingStore();
  const { items: inventoryItems, loadInitialData } = useInventoryStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [supplierName, setSupplierName] = useState('');
  const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedItemId, setSelectedItemId] = useState('TOT-001');
  const [qty, setQty] = useState('10');
  const [unitPrice, setUnitPrice] = useState('240');
  const [poLines, setPoLines] = useState<
    { id: string; productId: string; productName: string; quantity: number; unitPrice: number; totalPrice: number; receivedQuantity: number; unit: string }[]
  >([]);

  useEffect(() => {
    if (inventoryItems.length === 0) {
      loadInitialData().catch(() => {});
    }
  }, [inventoryItems.length, loadInitialData]);

  const filteredPOs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return purchaseOrders;
    return purchaseOrders.filter(
      po => po.poNumber.toLowerCase().includes(q) || po.supplierName.toLowerCase().includes(q) || po.status.toLowerCase().includes(q)
    );
  }, [purchaseOrders, searchTerm]);

  const handleAddLine = () => {
    const invItem = inventoryItems.find(i => i.id === selectedItemId);
    const numQty = Number(qty);
    const numPrice = Number(unitPrice);
    if (!invItem || !Number.isFinite(numQty) || numQty <= 0 || !Number.isFinite(numPrice) || numPrice < 0) return;

    setPoLines(prev => [
      ...prev,
      {
        id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        productId: invItem.id,
        productName: invItem.name,
        quantity: numQty,
        unitPrice: numPrice,
        totalPrice: Math.round(numQty * numPrice * 100) / 100,
        receivedQuantity: 0,
        unit: invItem.unit
      }
    ]);
  };

  const handleSubmitPO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poLines.length === 0) return;
    const subtotal = poLines.reduce((s, l) => s + l.totalPrice, 0);
    const matchedSupplier = suppliers.find(s => s.name === supplierName);

    await createPO({
      supplierId: matchedSupplier?.id || 'sup_direct',
      supplierName: supplierName.trim() || 'Direct Market Purchase',
      status: 'APPROVED',
      items: poLines,
      subtotal,
      taxTotal: 0,
      grandTotal: subtotal,
      expectedDeliveryDate: expectedDate,
      createdBy: 'Manager'
    });

    setPoLines([]);
    setSupplierName('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search PO number or supplier..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create PO</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">PO Number</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Supplier</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Items</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Amount (₹)</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-center">Status</th>
                <th className="p-4 font-semibold text-slate-700 dark:text-slate-300 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredPOs.map(po => (
                <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/25 transition-colors">
                  <td className="p-4 font-medium text-indigo-600 dark:text-indigo-400">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 opacity-50" />
                      {po.poNumber}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{po.supplierName}</td>
                  <td className="p-4 text-xs text-slate-600 dark:text-slate-300">
                    {po.items?.map(i => `${i.productName} (${i.quantity} ${i.unit})`).join(', ') || '—'}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right font-bold text-slate-900 dark:text-white">
                    ₹{po.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-full ${
                        po.status === 'FULFILLED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : po.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : po.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {po.status === 'FULFILLED' ? 'RECEIVED IN STOCK' : po.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {po.status !== 'FULFILLED' && (
                        <button
                          type="button"
                          onClick={() => updatePOStatus(po.id, 'FULFILLED')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                          title="Receive goods into Inventory and post to Finance ledger"
                        >
                          <Truck className="w-3.5 h-3.5" /> Receive Stock
                        </button>
                      )}
                      {po.status === 'FULFILLED' && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" /> Stock Added
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => deletePO(po.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        title="Delete PO"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPOs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No purchase orders found</h3>
                      <p className="text-slate-500 max-w-sm mx-auto mb-6">
                        Create a Purchase Order and receive goods to automatically add stock to your 144 Master Inventory items.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create PO</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Create Purchase Order (Linked to Master Inventory)</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitPO} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    list="talkos-suppliers-list"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    placeholder="Select or type vendor name"
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                  />
                  <datalist id="talkos-suppliers-list">
                    {suppliers.map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Add Inventory Item to PO</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-xs text-slate-500 mb-1">Master Inventory Item</label>
                    <select
                      value={selectedItemId}
                      onChange={e => {
                        const id = e.target.value;
                        setSelectedItemId(id);
                        const found = inventoryItems.find(i => i.id === id);
                        if (found && found.costPrice > 0) {
                          setUnitPrice(String(found.costPrice));
                        }
                      }}
                      className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    >
                      {inventoryItems.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.id} — {item.name} ({item.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Qty</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-500 mb-1">Rate (₹)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={unitPrice}
                      onChange={e => setUnitPrice(e.target.value)}
                      className="w-full px-2.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                {poLines.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="py-1 text-left">Item</th>
                          <th className="py-1 text-right">Qty</th>
                          <th className="py-1 text-right">Unit Rate</th>
                          <th className="py-1 text-right">Total</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {poLines.map(line => (
                          <tr key={line.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-1.5 font-medium">
                              {line.productId} — {line.productName}
                            </td>
                            <td className="py-1.5 text-right">
                              {line.quantity} {line.unit}
                            </td>
                            <td className="py-1.5 text-right">₹{line.unitPrice.toFixed(2)}</td>
                            <td className="py-1.5 text-right font-bold">₹{line.totalPrice.toFixed(2)}</td>
                            <td className="py-1.5 text-right">
                              <button
                                type="button"
                                onClick={() => setPoLines(prev => prev.filter(p => p.id !== line.id))}
                                className="text-rose-500 hover:text-rose-700 ml-2"
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex justify-end pt-2 font-bold text-sm text-slate-900 dark:text-white">
                      Order Total: ₹{poLines.reduce((s, l) => s + l.totalPrice, 0).toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poLines.length === 0 || !supplierName.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
