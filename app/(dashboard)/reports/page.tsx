'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { BarChart3, Users, FileText, CreditCard, TrendingUp, CheckCircle2, Download } from 'lucide-react';
import type { ClientPlan, Payment } from '@/types';

interface MonthlyData {
  month: string;
  amount: number;
  count: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalStats, setTotalStats] = useState({
    clients: 0, plans: 0, collected: 0, outstanding: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cliRes, plansRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact' }),
      supabase
        .from('client_plans')
        .select('*, client:clients(full_name), plan:plans(name, plan_type)')
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*, client_plan:client_plans(client:clients(full_name), plan:plans(name))')
        .order('payment_date', { ascending: false }),
    ]);

    const plans = (plansRes.data ?? []) as ClientPlan[];
    const pays = (paymentsRes.data ?? []) as Payment[];

    const totalCollected = pays.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = plans.reduce((s, p) => s + (p.balance ?? 0), 0);

    setClientPlans(plans);
    setPayments(pays);
    setTotalStats({
      clients: cliRes.count ?? 0,
      plans: plans.length,
      collected: totalCollected,
      outstanding: totalOutstanding,
    });

    // Build monthly collections
    const monthly: Record<string, MonthlyData> = {};
    pays.forEach((p) => {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      if (!monthly[key]) monthly[key] = { month: label, amount: 0, count: 0 };
      monthly[key].amount += p.amount;
      monthly[key].count += 1;
    });
    const sortedMonthly = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([, v]) => v);
    setMonthlyData(sortedMonthly);

    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxBar = Math.max(...monthlyData.map((m) => m.amount), 1);

  const statusBreakdown = [
    { label: 'Active', count: clientPlans.filter((p) => p.status === 'active').length, color: 'bg-blue-500' },
    { label: 'Completed', count: clientPlans.filter((p) => p.status === 'completed').length, color: 'bg-green-500' },
    { label: 'Cancelled', count: clientPlans.filter((p) => p.status === 'cancelled').length, color: 'bg-red-400' },
    { label: 'On Hold', count: clientPlans.filter((p) => p.status === 'on_hold').length, color: 'bg-yellow-400' },
  ];

  const planTypeBreakdown: Record<string, number> = {};
  clientPlans.forEach((cp) => {
    const t = (cp as any).plan?.plan_type ?? 'unknown';
    planTypeBreakdown[t] = (planTypeBreakdown[t] ?? 0) + 1;
  });

  return (
    <div>
      <TopBar
        title="Reports"
        subtitle="Overview of all client and payment records"
      />

      <div className="p-8 space-y-8">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            { label: 'Total Clients', value: totalStats.clients, icon: <Users size={20} />, color: 'bg-blue-50 text-blue-600' },
            { label: 'Total Plans', value: totalStats.plans, icon: <FileText size={20} />, color: 'bg-purple-50 text-purple-600' },
            { label: 'Total Collected', value: formatCurrency(totalStats.collected), icon: <TrendingUp size={20} />, color: 'bg-green-50 text-green-600' },
            { label: 'Outstanding Balance', value: formatCurrency(totalStats.outstanding), icon: <CreditCard size={20} />, color: 'bg-orange-50 text-orange-600' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${item.color}`}>{item.icon}</div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{loading ? '-' : item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Monthly Collections Bar Chart */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Monthly Collections</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Last 6 months</p>
                </div>
                <BarChart3 size={18} className="text-gray-300" />
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">Loading chart...</div>
              ) : monthlyData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No payment data yet.</div>
              ) : (
                <div className="flex items-end gap-3 h-48">
                  {monthlyData.map((m, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">{formatCurrency(m.amount)}</span>
                      <div
                        className="w-full bg-gradient-to-t from-[#007AFF] to-blue-400 rounded-t-xl transition-all duration-700"
                        style={{ height: `${Math.max((m.amount / maxBar) * 140, 8)}px` }}
                      />
                      <span className="text-xs text-gray-400 text-center leading-tight">{m.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Plan Status Breakdown */}
          <Card>
            <CardHeader>
              <h2 className="text-base font-semibold text-gray-900">Plan Status</h2>
              <p className="text-sm text-gray-400 mt-0.5">Distribution overview</p>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {statusBreakdown.map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">{item.label}</span>
                      <span className="text-gray-900 font-semibold">{loading ? '-' : item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all duration-700`}
                        style={{ width: totalStats.plans > 0 ? `${(item.count / totalStats.plans) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">By Plan Type</p>
                <div className="space-y-1.5">
                  {Object.entries(planTypeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">{type}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* All Client Plans Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">All Client Plans</h2>
                <p className="text-sm text-gray-400 mt-0.5">Complete list of enrolled plans</p>
              </div>
            </div>
          </CardHeader>
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Loading...</div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th>
                <Th>Plan</Th>
                <Th>Total Amount</Th>
                <Th>Paid</Th>
                <Th>Balance</Th>
                <Th>Status</Th>
                <Th>Service Ready</Th>
                <Th>Start Date</Th>
              </TableHead>
              <TableBody>
                {clientPlans.map((cp) => (
                  <Tr key={cp.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {getInitials((cp as any).client?.full_name ?? '?')}
                        </div>
                        <span className="font-medium text-gray-900">{(cp as any).client?.full_name ?? '-'}</span>
                      </div>
                    </Td>
                    <Td>
                      <span className="text-gray-700">{(cp as any).plan?.name ?? '-'}</span>
                    </Td>
                    <Td>{formatCurrency(cp.total_amount)}</Td>
                    <Td><span className="text-green-600 font-medium">{formatCurrency(cp.paid_amount)}</span></Td>
                    <Td>
                      <span className={cp.balance > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        {formatCurrency(cp.balance)}
                      </span>
                    </Td>
                    <Td>
                      <Badge
                        variant={cp.status === 'active' ? 'info' : cp.status === 'completed' ? 'success' : cp.status === 'cancelled' ? 'danger' : 'warning'}
                      >
                        {cp.status.replace('_', ' ').charAt(0).toUpperCase() + cp.status.replace('_', ' ').slice(1)}
                      </Badge>
                    </Td>
                    <Td>
                      {cp.service_ready ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 size={14} /> <span className="text-xs font-medium">Ready</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Pending</span>
                      )}
                    </Td>
                    <Td>{formatDate(cp.start_date)}</Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">All Payment Records</h2>
            <p className="text-sm text-gray-400 mt-0.5">{payments.length} total transactions</p>
          </CardHeader>
          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">No payments recorded.</div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th>
                <Th>Plan</Th>
                <Th>Amount</Th>
                <Th>Method</Th>
                <Th>Date</Th>
                <Th>Reference #</Th>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium text-gray-900">{(p as any).client_plan?.client?.full_name ?? '-'}</Td>
                    <Td>{(p as any).client_plan?.plan?.name ?? '-'}</Td>
                    <Td><span className="font-semibold text-green-600">{formatCurrency(p.amount)}</span></Td>
                    <Td>
                      <Badge variant={p.payment_method === 'cash' ? 'success' : p.payment_method === 'gcash' ? 'info' : 'default'}>
                        {p.payment_method.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </Td>
                    <Td>{formatDate(p.payment_date)}</Td>
                    <Td><span className="font-mono text-xs text-gray-500">{p.reference_number || '-'}</span></Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
