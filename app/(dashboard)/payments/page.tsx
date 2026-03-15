'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { Plus, Search, CreditCard, TrendingUp, Banknote } from 'lucide-react';
import type { Payment, ClientPlan } from '@/types';

const emptyForm = {
  client_plan_id: '',
  amount: 0,
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'cash' as Payment['payment_method'],
  reference_number: '',
  notes: '',
};

export default function PaymentsPage() {
  const supabase = createClient();
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
        .select('*, client_plan:client_plans(id, total_amount, paid_amount, balance, status, client:clients(full_name), plan:plans(name))')
        .order('payment_date', { ascending: false }),
      supabase
        .from('client_plans')
        .select('id, client:clients(full_name), plan:plans(name), balance, status')
        .eq('status', 'active'),
    ]);
    const data = (paymentsRes.data ?? []) as Payment[];
    setPayments(data);
    setClientPlans((plansRes.data ?? []) as ClientPlan[]);
    setTotalCollected(data.reduce((s, p) => s + (p.amount ?? 0), 0));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { error: payErr } = await supabase.from('payments').insert([form]);
      if (payErr) throw payErr;

      // Update client_plan paid_amount (balance is a computed column)
      const plan = clientPlans.find((p) => p.id === form.client_plan_id);
      if (plan) {
        const newPaid = (plan.paid_amount ?? 0) + form.amount;
        const newBalance = (plan.total_amount ?? 0) - newPaid;
        const newStatus = newBalance <= 0 ? 'completed' : 'active';
        await supabase
          .from('client_plans')
          .update({ paid_amount: newPaid, status: newStatus })
          .eq('id', form.client_plan_id);
      }

      setModalOpen(false);
      setForm(emptyForm);
      fetchData();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = payments.filter((p) => {
    const clientName = (p as any).client_plan?.client?.full_name ?? '';
    const planName = (p as any).client_plan?.plan?.name ?? '';
    const q = search.toLowerCase();
    return clientName.toLowerCase().includes(q) || planName.toLowerCase().includes(q) || (p.reference_number ?? '').toLowerCase().includes(q);
  });

  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    gcash: 'GCash',
    bank_transfer: 'Bank Transfer',
    check: 'Check',
  };

  const methodVariants: Record<string, 'success' | 'info' | 'default' | 'warning'> = {
    cash: 'success',
    gcash: 'info',
    bank_transfer: 'default',
    check: 'warning',
  };

  return (
    <div>
      <TopBar
        title="Payment Monitoring"
        subtitle={`Total collected: ${formatCurrency(totalCollected)}`}
        actions={
          <Button onClick={() => { setForm(emptyForm); setError(''); setModalOpen(true); }} size="sm">
            <Plus size={16} /> Record Payment
          </Button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <Banknote size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Collected</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{formatCurrency(totalCollected)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <CreditCard size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Transactions</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">{payments.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <TrendingUp size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Average Payment</p>
                <p className="text-xl font-bold text-gray-900 mt-0.5">
                  {payments.length > 0 ? formatCurrency(totalCollected / payments.length) : 'PHP 0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by client, plan, reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Loading payments...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No payments recorded</p>
              <p className="text-gray-400 text-sm mt-1">Record the first payment to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client / Plan</Th>
                <Th>Amount</Th>
                <Th>Date</Th>
                <Th>Method</Th>
                <Th>Reference #</Th>
                <Th>Balance After</Th>
              </TableHead>
              <TableBody>
                {filtered.map((payment) => (
                  <Tr key={payment.id}>
                    <Td>
                      <p className="font-medium text-gray-900">{(payment as any).client_plan?.client?.full_name ?? '-'}</p>
                      <p className="text-xs text-gray-400">{(payment as any).client_plan?.plan?.name ?? '-'}</p>
                    </Td>
                    <Td>
                      <span className="font-semibold text-green-600">{formatCurrency(payment.amount)}</span>
                    </Td>
                    <Td>{formatDate(payment.payment_date)}</Td>
                    <Td>
                      <Badge variant={methodVariants[payment.payment_method] ?? 'default'}>
                        {methodLabels[payment.payment_method] ?? payment.payment_method}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="text-gray-500 font-mono text-xs">
                        {payment.reference_number || '-'}
                      </span>
                    </Td>
                    <Td>
                      <span className={(payment as any).client_plan?.balance > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                        {formatCurrency((payment as any).client_plan?.balance ?? 0)}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <Select
            label="Client Plan"
            value={form.client_plan_id}
            onChange={(e) => setForm({ ...form, client_plan_id: e.target.value })}
            required
          >
            <option value="">Select a client plan...</option>
            {clientPlans.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {(cp as any).client?.full_name} - {(cp as any).plan?.name} (Balance: {formatCurrency((cp as any).balance ?? 0)})
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Amount (PHP)"
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              required
            />
            <Input
              label="Payment Date"
              type="date"
              value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Payment Method"
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value as Payment['payment_method'] })}
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
            </Select>
            <Input
              label="Reference Number"
              placeholder="Optional"
              value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
            />
          </div>
          <Textarea
            label="Notes"
            placeholder="Optional notes..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
