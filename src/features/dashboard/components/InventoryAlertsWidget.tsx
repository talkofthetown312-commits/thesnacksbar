import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { Package, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { inventoryService } from '../../inventory/services/inventoryService';
import { InventoryItem } from '../../inventory/models/inventory';

export function InventoryAlertsWidget() {
  const [items, setItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    inventoryService.getItems().then(setItems).catch(() => setItems([]));
  }, []);

  const alerts = items.filter(
    i => i.stockVerified !== false && i.status !== 'INACTIVE' && i.currentStock <= i.reorderLevel
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-500" />
          Low Stock Alerts
        </CardTitle>
        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center text-xs font-bold">
          {alerts.length}
        </span>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">No verified low-stock alerts.</p>
          ) : (
            alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.name}</p>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {alert.currentStock} {alert.unit} left
                </span>
              </div>
            ))
          )}
        </div>
        
        <Link 
          to="/inventory" 
          className="mt-4 block w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          View all inventory ({items.length} master items)
        </Link>
      </CardContent>
    </Card>
  );
}
