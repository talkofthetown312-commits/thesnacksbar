import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { Activity, ShoppingCart } from 'lucide-react';
import { posService } from '../../pos/services/posService';
import { Order } from '../../pos/models/pos';

export function RecentActivity() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    posService.getOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-slate-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No recorded order activity yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div key={order.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-500" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {order.orderNumber} ({order.orderType})
                  </span>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">₹{order.total}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
