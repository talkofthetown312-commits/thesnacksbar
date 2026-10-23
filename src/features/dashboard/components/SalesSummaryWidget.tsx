import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { IndianRupee, ShoppingBag } from 'lucide-react';
import { posService } from '../../pos/services/posService';
import { Order } from '../../pos/models/pos';

export function SalesSummaryWidget() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    posService.getOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const paidOrders = orders.filter(o => o.status === 'PAID');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const avgTicket = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg text-[#800000]">Revenue Overview</CardTitle>
        <span className="text-xs font-bold text-[#800000] bg-[#fdf5f6] border border-[#ebd5da] px-2.5 py-1 rounded-full">Recorded</span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 bg-[#fdf5f6] p-3 rounded-lg border border-[#ebd5da]">
            <p className="text-xs font-bold text-[#800000]/70 flex items-center gap-1"><IndianRupee className="w-4 h-4"/> Revenue</p>
            <p className="text-2xl font-black text-[#800000]">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <div className="space-y-1 bg-[#fdf5f6] p-3 rounded-lg border border-[#ebd5da]">
            <p className="text-xs font-bold text-[#800000]/70 flex items-center gap-1"><ShoppingBag className="w-4 h-4"/> Paid Orders</p>
            <p className="text-2xl font-black text-[#800000]">{paidOrders.length}</p>
          </div>
          <div className="space-y-1 bg-[#fdf5f6] p-3 rounded-lg border border-[#ebd5da]">
            <p className="text-xs font-bold text-[#800000]/70">Avg Ticket</p>
            <p className="text-2xl font-black text-[#800000]">₹{avgTicket.toFixed(0)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
