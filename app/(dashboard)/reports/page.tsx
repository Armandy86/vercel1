'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHero } from '@/components/PageHero';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { BarChart3, Users, FileText, CreditCard, TrendingUp, CheckCircle2, Download } from 'lucide-react';
import type { ClientPlan, Payment } from '@/types';

interface MonthlyData { month: string; amount: number; count: number; }

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };
  const csv = [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalStats, setTotalStats] = useState({ clients: 0, plans: 0, collected: 0, outstanding: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [cliRes, plansRes, paymentsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact' }),
      supabase.from('client_plans').select('*, client:clients(full_name), plan:plans(name, plan_type)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*, client_plan:client_plans(client:clients(full_name), plan:plans(name))').order('payment_date', { ascending: false }),
    ]);
    const plans = (plansRes.data ?? []) as ClientPlan[];
    const pays = (paymentsRes.data ?? []) as Payment[];
    const totalCollected = pays.reduce((s, p) => s + p.amount, 0);
    const totalOutstanding = plans.reduce((s, p) => s + (p.balance ?? 0), 0);
    setClientPlans(plans); setPayments(pays);
    setTotalStats({ clients: cliRes.count ?? 0, plans: plans.length, collected: totalCollected, outstanding: totalOutstanding });

    const monthly: Record<string, MonthlyData> = {};
    pays.forEach((p) => {
      const d = new Date(p.payment_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-PH', { month: 'short', year: 'numeric' });
      if (!monthly[key]) monthly[key] = { month: label, amount: 0, count: 0 };
      monthly[key].amount += p.amount; monthly[key].count += 1;
    });
    setMonthlyData(Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const maxBar = Math.max(...monthlyData.map((m) => m.amount), 1);

  const statusBreakdown = [
    { label: 'Active', count: clientPlans.filter((p) => p.status === 'active').length, color: '#3b82f6' },
    { label: 'Completed', count: clientPlans.filter((p) => p.status === 'completed').length, color: '#22c55e' },
    { label: 'Cancelled', count: clientPlans.filter((p) => p.status === 'cancelled').length, color: '#f87171' },
    { label: 'On Hold', count: clientPlans.filter((p) => p.status === 'on_hold').length, color: '#facc15' },
  ];

  const planTypeBreakdown: Record<string, number> = {};
  clientPlans.forEach((cp) => { const t = (cp as any).plan?.plan_type ?? 'unknown'; planTypeBreakdown[t] = (planTypeBreakdown[t] ?? 0) + 1; });

  const exportClientPlans = () => {
    const headers = ['Client', 'Plan', 'Plan Type', 'Total Amount', 'Paid Amount', 'Balance', 'Status', 'Service Ready', 'Start Date'];
    const rows = clientPlans.map((cp) => [
      (cp as any).client?.full_name ?? '-',
      (cp as any).plan?.name ?? '-',
      (cp as any).plan?.plan_type ?? '-',
      cp.total_amount.toString(),
      cp.paid_amount.toString(),
      (cp.balance ?? 0).toString(),
      cp.status,
      cp.service_ready ? 'Yes' : 'No',
      cp.start_date ?? '-',
    ]);
    downloadCSV(`client-plans-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportPayments = () => {
    const headers = ['Client', 'Plan', 'Amount', 'Payment Method', 'Payment Date', 'Reference Number', 'Notes'];
    const rows = payments.map((p) => [
      (p as any).client_plan?.client?.full_name ?? '-',
      (p as any).client_plan?.plan?.name ?? '-',
      p.amount.toString(),
      p.payment_method.replace('_', ' '),
      p.payment_date ?? '-',
      p.reference_number ?? '-',
      p.notes ?? '-',
    ]);
    downloadCSV(`payments-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportSummary = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Clients', totalStats.clients.toString()],
      ['Total Plans', totalStats.plans.toString()],
      ['Total Collected', totalStats.collected.toString()],
      ['Outstanding Balance', totalStats.outstanding.toString()],
      ['', ''],
      ['Plan Status', 'Count'],
      ...statusBreakdown.map((s) => [s.label, s.count.toString()]),
      ['', ''],
      ['Plan Type', 'Count'],
      ...Object.entries(planTypeBreakdown).map(([type, count]) => [type, count.toString()]),
      ['', ''],
      ['Monthly Collections', ''],
      ['Month', 'Amount'],
      ...monthlyData.map((m) => [m.month, m.amount.toString()]),
    ];
    downloadCSV(`summary-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div>
      <PageHero title="Reports" subtitle="Overview of all client and payment records" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <Button size="sm" onClick={exportSummary} disabled={loading}>
            <Download size={14} /> Export Summary
          </Button>
          <Button size="sm" variant="secondary" onClick={exportClientPlans} disabled={loading}>
            <Download size={14} /> Export Client Plans
          </Button>
          <Button size="sm" variant="secondary" onClick={exportPayments} disabled={loading}>
            <Download size={14} /> Export Payments
          </Button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Clients', value: totalStats.clients },
            { label: 'Total Plans', value: totalStats.plans },
            { label: 'Total Collected', value: formatCurrency(totalStats.collected) },
            { label: 'Outstanding', value: formatCurrency(totalStats.outstanding) },
          ].map((item) => (
            <div key={item.label} className="fp-stat">
              <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{item.label}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginTop: 4 }}>{loading ? '-' : item.value}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Monthly Collections</h2>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Last 6 months</p>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
              ) : monthlyData.length === 0 ? (
                <div style={{ height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>No payment data yet.</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 176 }}>
                  {monthlyData.map((m, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{formatCurrency(m.amount)}</span>
                      <div style={{ width: '100%', borderRadius: '4px 4px 0 0', transition: 'height 0.7s', background: 'linear-gradient(to top, #5C1A1A, #7A2E2E)', height: Math.max((m.amount / maxBar) * 120, 6) }} />
                      <span style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: '1.2' }}>{m.month}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>Plan Status</h2></CardHeader>
            <CardBody>
              <div>
                {statusBreakdown.map((item) => (
                  <div key={item.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#4b5563' }}>{item.label}</span>
                      <span style={{ fontWeight: 600, fontSize: 12, color: '#111827' }}>{loading ? '-' : item.count}</span>
                    </div>
                    <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 9999, height: 5 }}>
                      <div style={{ width: totalStats.plans > 0 ? `${(item.count / totalStats.plans) * 100}%` : '0%', height: 5, borderRadius: 9999, background: item.color, transition: 'width 0.7s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>By Plan Type</p>
                {Object.entries(planTypeBreakdown).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ color: '#4b5563', textTransform: 'capitalize' }}>{type}</span>
                    <Badge>{count}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Client Plans Table */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>All Client Plans</h2>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>Complete list of enrolled plans</p>
              </div>
              <Button size="sm" variant="ghost" onClick={exportClientPlans} disabled={loading}>
                <Download size={13} /> CSV
              </Button>
            </div>
          </CardHeader>
          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th><Th>Plan</Th><Th>Total</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th>Service</Th><Th>Start Date</Th>
              </TableHead>
              <TableBody>
                {clientPlans.map((cp) => (
                  <Tr key={cp.id}>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#5C1A1A', color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{getInitials((cp as any).client?.full_name ?? '?')}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{(cp as any).client?.full_name ?? '-'}</span>
                      </div>
                    </Td>
                    <Td><span style={{ fontSize: 13 }}>{(cp as any).plan?.name ?? '-'}</span></Td>
                    <Td>{formatCurrency(cp.total_amount)}</Td>
                    <Td><span style={{ color: '#16a34a', fontWeight: 500 }}>{formatCurrency(cp.paid_amount)}</span></Td>
                    <Td><span style={{ fontWeight: 500, color: cp.balance > 0 ? '#ef4444' : '#16a34a' }}>{formatCurrency(cp.balance)}</span></Td>
                    <Td><Badge variant={cp.status === 'active' ? 'info' : cp.status === 'completed' ? 'success' : cp.status === 'cancelled' ? 'danger' : 'warning'}>{cp.status.replace('_', ' ').charAt(0).toUpperCase() + cp.status.replace('_', ' ').slice(1)}</Badge></Td>
                    <Td>
                      {cp.service_ready ? (
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#16a34a' }}>Ready</span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Pending</span>
                      )}
                    </Td>
                    <Td>{formatDate(cp.start_date)}</Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0 }}>All Payment Records</h2>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{payments.length} total transactions</p>
              </div>
              <Button size="sm" variant="ghost" onClick={exportPayments} disabled={loading}>
                <Download size={13} /> CSV
              </Button>
            </div>
          </CardHeader>
          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : payments.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No payments recorded.</div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th><Th>Plan</Th><Th>Amount</Th><Th>Method</Th><Th>Date</Th><Th>Reference</Th>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <Tr key={p.id}>
                    <Td><span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{(p as any).client_plan?.client?.full_name ?? '-'}</span></Td>
                    <Td><span style={{ fontSize: 13 }}>{(p as any).client_plan?.plan?.name ?? '-'}</span></Td>
                    <Td><span style={{ fontWeight: 600, color: '#16a34a' }}>{formatCurrency(p.amount)}</span></Td>
                    <Td><Badge variant={p.payment_method === 'cash' ? 'success' : p.payment_method === 'gcash' ? 'info' : 'default'}>{p.payment_method.replace('_', ' ').toUpperCase()}</Badge></Td>
                    <Td>{formatDate(p.payment_date)}</Td>
                    <Td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{p.reference_number || '-'}</span></Td>
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
