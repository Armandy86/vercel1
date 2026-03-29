'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Search, CreditCard, TrendingUp, Banknote } from 'lucide-react';
import type { Payment, ClientPlan } from '@/types';

const emptyForm = {
  client_plan_id: '', amount: 0, payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash' as Payment['payment_method'], reference_number: '', notes: '',
};

function PaymentsContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const filterClientId = searchParams.get('client');

  const [payments, setPayments] = useState<Payment[]>([]);
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [totalCollected, setTotalCollected] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [paymentsRes, plansRes] = await Promise.all([
      supabase
        .from('payments')
        .select(
          '*, client_plan:client_plans(id, client_id, total_amount, paid_amount, balance, status, client:clients(id, full_name), plan:plans(name))'
        )
        .order('payment_date', { ascending: false }),
      supabase
        .from('client_plans')
        .select('id, client_id, paid_amount, total_amount, balance, status, client:clients(id, full_name), plan:plans(name)')
        .neq('status', 'cancelled'),
    ]);
    const data = (paymentsRes.data ?? []) as Payment[];
    const fromDb = (plansRes.data ?? []) as unknown as ClientPlan[];
    // Include any client_plan rows attached to payments (e.g. status completed but balance remains, or RLS edge cases)
    const byId = new Map<string, ClientPlan>();
    fromDb.forEach((cp) => byId.set(cp.id, cp));
    data.forEach((p) => {
      const embed = (p as any).client_plan as Record<string, unknown> | null | undefined;
      if (!embed?.id) return;
      const id = embed.id as string;
      if (byId.has(id)) return;
      if (embed.status === 'cancelled') return;
      byId.set(id, {
        id,
        client_id: embed.client_id as string,
        plan_id: '',
        start_date: '',
        total_amount: Number(embed.total_amount ?? 0),
        paid_amount: Number(embed.paid_amount ?? 0),
        balance: Number(embed.balance ?? 0),
        status: embed.status as ClientPlan['status'],
        service_ready: false,
        created_at: '',
        client: embed.client as ClientPlan['client'],
        plan: embed.plan as ClientPlan['plan'],
      });
    });
    setPayments(data);
    setClientPlans(Array.from(byId.values()));
    setTotalCollected(data.reduce((s, p) => s + (p.amount ?? 0), 0));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const byClient = useMemo(() => {
    if (!filterClientId) return payments;
    return payments.filter((p) => {
      const cp = (p as any).client_plan;
      const cid = cp?.client_id ?? cp?.client?.id;
      return cid === filterClientId;
    });
  }, [payments, filterClientId]);

  const filterClientName = useMemo(() => {
    if (!filterClientId || byClient.length === 0) return '';
    return (byClient[0] as any).client_plan?.client?.full_name ?? '';
  }, [filterClientId, byClient]);

  const [urlClientName, setUrlClientName] = useState('');
  useEffect(() => {
    if (!filterClientId) {
      setUrlClientName('');
      return;
    }
    if (filterClientName) {
      setUrlClientName('');
      return;
    }
    let cancelled = false;
    void supabase
      .from('clients')
      .select('full_name')
      .eq('id', filterClientId)
      .single()
      .then(({ data }) => {
        if (!cancelled && data?.full_name) setUrlClientName(data.full_name);
      });
    return () => {
      cancelled = true;
    };
  }, [filterClientId, filterClientName, supabase]);

  const displayClientName = filterClientName || urlClientName;

  const totalCollectedFiltered = byClient.reduce((s, p) => s + (p.amount ?? 0), 0);

  const plansForThisClient = useMemo(() => {
    if (!filterClientId) return [];
    return clientPlans.filter((cp) => (cp as any).client_id === filterClientId || (cp as any).client?.id === filterClientId);
  }, [clientPlans, filterClientId]);

  const plansWithBalance = useMemo(
    () => plansForThisClient.filter((cp) => (cp.balance ?? 0) > 0),
    [plansForThisClient]
  );

  const totalBalanceDue = useMemo(
    () => plansWithBalance.reduce((s, cp) => s + (cp.balance ?? 0), 0),
    [plansWithBalance]
  );

  const openRecordPayment = (clientPlanId: string, presetAmount?: number) => {
    setForm({
      ...emptyForm,
      client_plan_id: clientPlanId,
      amount: presetAmount && presetAmount > 0 ? presetAmount : 0,
      payment_date: new Date().toISOString().split('T')[0],
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { error: payErr } = await supabase.from('payments').insert([form]);
      if (payErr) throw payErr;
      const plan = clientPlans.find((p) => p.id === form.client_plan_id);
      if (plan) {
        const newPaid = (plan.paid_amount ?? 0) + form.amount;
        const newBalance = (plan.total_amount ?? 0) - newPaid;
        await supabase.from('client_plans').update({ paid_amount: newPaid, status: newBalance <= 0 ? 'completed' : 'active' }).eq('id', form.client_plan_id);
      }
      setModalOpen(false); setForm(emptyForm); fetchData();
    } catch (err: any) { setError(err.message ?? 'Something went wrong.'); } finally { setSaving(false); }
  };

  const filtered = byClient.filter((p) => {
    const cn = (p as any).client_plan?.client?.full_name ?? '';
    const pn = (p as any).client_plan?.plan?.name ?? '';
    const q = search.toLowerCase();
    return cn.toLowerCase().includes(q) || pn.toLowerCase().includes(q) || (p.reference_number ?? '').toLowerCase().includes(q);
  });

  const methodLabels: Record<string, string> = { cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer', check: 'Check' };
  const methodVariants: Record<string, 'success' | 'info' | 'default' | 'warning'> = { cash: 'success', gcash: 'info', bank_transfer: 'default', check: 'warning' };

  const statsPayments = filterClientId ? byClient : payments;
  const statsTotal = filterClientId ? totalCollectedFiltered : totalCollected;
  const statsCount = statsPayments.length;
  const statsAvg = statsCount > 0 ? statsTotal / statsCount : 0;

  return (
    <div>
      <PageHero
        title="Payment Monitoring"
        subtitle={
          filterClientId
            ? displayClientName
              ? `Client: ${displayClientName} - Total collected: ${formatCurrency(totalCollectedFiltered)}`
              : `Total collected: ${formatCurrency(totalCollectedFiltered)}`
            : `Total collected: ${formatCurrency(totalCollected)}`
        }
      />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {filterClientId ? (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#4b5563' }}>Showing payments for this client only.</span>
            <Link href="/payments" style={{ fontSize: 13, fontWeight: 600, color: '#5C1A1A', textDecoration: 'none' }}>
              Show all payments
            </Link>
          </div>
        ) : null}

        {filterClientId && !loading ? (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>Settle balance</h2>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
                Record a payment for {displayClientName || 'this client'}. Click a plan below to open the payment form with that plan selected.
              </p>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {plansWithBalance.length === 0 ? (
                <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                  {plansForThisClient.length === 0
                    ? 'No active plan assignment for this client. Assign a plan on the Plans page first.'
                    : 'No outstanding balance on active plans. Balances are paid in full or plans are completed.'}
                </p>
              ) : (
                <>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>
                    Total due: <span style={{ color: '#b91c1c' }}>{formatCurrency(totalBalanceDue)}</span>
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plansWithBalance.map((cp) => (
                      <div
                        key={cp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          flexWrap: 'wrap',
                          padding: '12px 14px',
                          background: '#f9fafb',
                          borderRadius: 8,
                          border: '1px solid #e5e7eb',
                        }}
                      >
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{(cp as any).plan?.name ?? 'Plan'}</p>
                          <p style={{ fontSize: 12, color: '#b91c1c', margin: '4px 0 0' }}>Balance: {formatCurrency(cp.balance ?? 0)}</p>
                        </div>
                        <Button type="button" size="sm" onClick={() => openRecordPayment(cp.id, cp.balance ?? 0)}>
                          Pay this plan
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '14px 0 0' }}>
                    You can change the amount in the form if the client pays a partial amount.
                  </p>
                </>
              )}
            </div>
          </Card>
        ) : null}

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { icon: <Banknote size={18} />, label: 'Total Collected', value: formatCurrency(statsTotal), iconBg: '#f0fdf4', iconColor: '#16a34a' },
            { icon: <CreditCard size={18} />, label: 'Total Transactions', value: statsCount.toString(), iconBg: '#eff6ff', iconColor: '#2563eb' },
          ].map((item) => (
            <div key={item.label} className="fp-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, borderRadius: 8, background: item.iconBg, color: item.iconColor }}>{item.icon}</div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: 0 }}>{item.label}</p>
                  <p style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>{item.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="fp-input" type="text" placeholder="Search by client, plan, reference..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <Button
            onClick={() => {
              const first = filterClientId ? plansWithBalance[0] : undefined;
              if (first) openRecordPayment(first.id, first.balance ?? 0);
              else {
                setForm(emptyForm);
                setError('');
                setModalOpen(true);
              }
            }}
            size="sm"
          >
            <Plus size={15} /> Record Payment
          </Button>
        </div>

        <Card>
          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading payments...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center' }}>
              <CreditCard size={20} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>
                {filterClientId
                  ? byClient.length === 0
                    ? 'No payments for this client yet.'
                    : 'No matching payments for this filter.'
                  : 'No payments recorded'}
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                {filterClientId && byClient.length === 0
                  ? 'Use Record Payment to add a transaction for this client.'
                  : 'Record the first payment to get started'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client / Plan</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Balance</Th>
              </TableHead>
              <TableBody>
                {filtered.map((payment) => {
                  const cp = (payment as any).client_plan;
                  const cid = cp?.client_id ?? cp?.client?.id;
                  return (
                  <Tr key={payment.id}>
                    <Td>
                      {cid ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/payments?client=${cid}`)}
                          style={{
                            cursor: 'pointer',
                            textAlign: 'left',
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            font: 'inherit',
                            width: '100%',
                          }}
                          title="View payment monitor for this client"
                        >
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#5C1A1A', margin: 0, textDecoration: 'underline', textDecorationColor: 'rgba(92,26,26,0.35)' }}>{cp?.client?.full_name ?? '-'}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{cp?.plan?.name ?? '-'}</p>
                        </button>
                      ) : (
                        <>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{cp?.client?.full_name ?? '-'}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{cp?.plan?.name ?? '-'}</p>
                        </>
                      )}
                    </Td>
                    <Td><span style={{ fontWeight: 600, color: '#16a34a', fontSize: 13 }}>{formatCurrency(payment.amount)}</span></Td>
                    <Td>{formatDate(payment.payment_date)}</Td>
                    <Td><Badge variant={methodVariants[payment.payment_method] ?? 'default'}>{methodLabels[payment.payment_method] ?? payment.payment_method}</Badge></Td>
                    <Td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>{payment.reference_number || '-'}</span></Td>
                    <Td>
                      <span style={{ fontWeight: 500, fontSize: 13, color: (payment as any).client_plan?.balance > 0 ? '#ef4444' : '#16a34a' }}>
                        {formatCurrency((payment as any).client_plan?.balance ?? 0)}
                      </span>
                    </Td>
                  </Tr>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleSave} style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <Select label="Client Plan" value={form.client_plan_id} onChange={(e) => setForm({ ...form, client_plan_id: e.target.value })} required>
              <option value="">Select a client plan...</option>
              {(filterClientId
                ? clientPlans.filter(
                    (cp) =>
                      (cp as any).client_id === filterClientId || (cp as any).client?.id === filterClientId
                  )
                : clientPlans
              ).map((cp) => (
                <option key={cp.id} value={cp.id}>
                  {(cp as any).client?.full_name} - {(cp as any).plan?.name} (Balance: {formatCurrency((cp as any).balance ?? 0)})
                </option>
              ))}
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Input label="Amount (PHP)" type="number" min="1" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
            <Input label="Payment Date" type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Select label="Payment Method" value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as Payment['payment_method'] })}>
              <option value="cash">Cash</option><option value="gcash">GCash</option><option value="bank_transfer">Bank Transfer</option><option value="check">Check</option>
            </Select>
            <Input label="Reference Number" placeholder="Optional" value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}><Textarea label="Notes" placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14 }}><p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p></div>}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ flex: 1 }}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHero title="Payment Monitoring" subtitle="Loading..." />
          <div style={{ maxWidth: 960, margin: '0 auto', padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Loading...
          </div>
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
