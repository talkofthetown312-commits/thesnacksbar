import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/components/ui/Card';
import { ChefHat } from 'lucide-react';
import { kdsService } from '../../kds/services/kdsService';
import { Ticket } from '../../kds/models/kds';

export function KitchenStatusWidget() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    kdsService.getTickets().then(setTickets).catch(() => setTickets([]));
  }, []);

  const openTickets = tickets.filter(t => t.status !== 'READY');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-slate-500" />
          Kitchen Status
        </CardTitle>
        <span className="px-2 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-medium">
          {openTickets.length > 0 ? 'Active' : 'Clear'}
        </span>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{openTickets.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Open Tickets</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{tickets.filter(t => t.status === 'READY').length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ready Tickets</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
