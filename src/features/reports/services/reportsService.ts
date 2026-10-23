import { SalesReport, ExpenseReport, DashboardMetrics } from '../models/reports';
import { posService } from '../../pos/services/posService';
import { financeService } from '../../finance/services/financeService';
import { purchasingService } from '../../purchasing/services/purchasingService';

class ReportsService {
  async getDashboardMetrics(): Promise<DashboardMetrics | null> {
    const [orders, transactions, purchaseOrders] = await Promise.all([
      posService.getOrders().catch(() => []),
      financeService.getTransactions().catch(() => []),
      purchasingService.getPurchaseOrders().catch(() => [])
    ]);

    const paidOrders = orders.filter(o => o.status === 'PAID');
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const todaySales = paidOrders
      .filter(o => o.createdAt.slice(0, 10) === todayStr)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const weeklySales = paidOrders
      .filter(o => new Date(o.createdAt) >= weekAgo)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const monthlySales = paidOrders
      .filter(o => new Date(o.createdAt) >= monthAgo)
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const totalCost = paidOrders
      .filter(o => new Date(o.createdAt) >= monthAgo)
      .reduce((sum, o) => sum + (o.totalCost || 0), 0);

    const grossProfit = Math.max(0, monthlySales - totalCost);

    const opExpensesFromTxns = transactions
      .filter(t => t.status === 'POSTED' && !t.id.startsWith('ftxn_sale_') && !t.id.startsWith('ftxn_po_'))
      .reduce((sum, t) => sum + (t.totalDebit || 0), 0);

    const fulfilledPOValue = purchaseOrders
      .filter(po => po.status === 'FULFILLED')
      .reduce((sum, po) => sum + (po.grandTotal || 0), 0);

    const operatingExpenses = Math.round((opExpensesFromTxns + fulfilledPOValue) * 100) / 100;
    const netProfit = Math.round((grossProfit - opExpensesFromTxns) * 100) / 100;
    const foodCostPercentage = monthlySales > 0 ? Math.round((totalCost / monthlySales) * 1000) / 10 : 0;

    return {
      todaySales: Math.round(todaySales * 100) / 100,
      weeklySales: Math.round(weeklySales * 100) / 100,
      monthlySales: Math.round(monthlySales * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit,
      foodCostPercentage,
      labourCostPercentage: 0,
      operatingExpenses
    };
  }

  async getSalesTrend(): Promise<SalesReport[]> {
    const orders = await posService.getOrders().catch(() => []);
    const paidOrders = orders.filter(o => o.status === 'PAID');
    const byDate = new Map<string, { gross: number; net: number; count: number }>();

    for (const order of paidOrders) {
      const date = order.createdAt.slice(0, 10);
      const curr = byDate.get(date) || { gross: 0, net: 0, count: 0 };
      curr.gross += order.total || 0;
      curr.net += Math.max(0, (order.subtotal || 0) - (order.discountAmount || 0));
      curr.count += 1;
      byDate.set(date, curr);
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({
        date,
        grossRevenue: Math.round(stats.gross * 100) / 100,
        netRevenue: Math.round(stats.net * 100) / 100,
        totalOrders: stats.count,
        averageBillValue: stats.count > 0 ? Math.round((stats.gross / stats.count) * 100) / 100 : 0
      }));
  }

  async getExpenseBreakdown(): Promise<ExpenseReport[]> {
    const [transactions, purchaseOrders] = await Promise.all([
      financeService.getTransactions().catch(() => []),
      purchasingService.getPurchaseOrders().catch(() => [])
    ]);

    const byCategory = new Map<string, number>();

    for (const po of purchaseOrders) {
      if (po.status === 'FULFILLED' && po.grandTotal > 0) {
        byCategory.set('Inventory & Raw Materials (POs)', (byCategory.get('Inventory & Raw Materials (POs)') || 0) + po.grandTotal);
      }
    }

    for (const txn of transactions) {
      if (txn.status === 'POSTED' && !txn.id.startsWith('ftxn_sale_') && !txn.id.startsWith('ftxn_po_')) {
        const label = txn.description || 'Operating Expense';
        byCategory.set(label, (byCategory.get(label) || 0) + (txn.totalDebit || 0));
      }
    }

    return Array.from(byCategory.entries()).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100
    }));
  }
}

export const reportsService = new ReportsService();
