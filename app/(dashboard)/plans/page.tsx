'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHero } from '@/components/PageHero';
import { Card, CardBody, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { Plus, Pencil, Trash2, FileText, Check, Users } from 'lucide-react';
import type { Plan, Client } from '@/types';

const emptyPlanForm = { name: '', description: '', price: 0, plan_type: 'silver' as Plan['plan_type'], is_active: true, benefits: '' };
const emptyAssignForm = { client_id: '', plan_id: '', start_date: new Date().toISOString().split('T')[0], total_amount: 0 };

const typeGradient: Record<string, string> = {
  bronze: 'linear-gradient(135deg, #d97706, #92400e)',
  silver: 'linear-gradient(135deg, #9ca3af, #4b5563)',
  gold: 'linear-gradient(135deg, #eab308, #a16207)',
  platinum: 'linear-gradient(135deg, #64748b, #334155)',
};

export default function PlansPage() {
  const supabase = createClient();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [assignForm, setAssignForm] = useState(emptyAssignForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [plansRes, clientsRes] = await Promise.all([
      supabase.from('plans').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, full_name').eq('status', 'active').order('full_name'),
    ]);
    setPlans(plansRes.data ?? []);
    setClients((clientsRes.data ?? []) as unknown as Client[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddPlan = () => { setSelectedPlan(null); setPlanForm(emptyPlanForm); setError(''); setPlanModal(true); };
  const openEditPlan = (p: Plan) => { setSelectedPlan(p); setPlanForm({ name: p.name, description: p.description, price: p.price, plan_type: p.plan_type, is_active: p.is_active, benefits: p.benefits?.join('\n') ?? '' }); setError(''); setPlanModal(true); };
  const openAssign = (p: Plan) => { setSelectedPlan(p); setAssignForm({ ...emptyAssignForm, plan_id: p.id, total_amount: p.price }); setError(''); setAssignModal(true); };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...planForm, benefits: planForm.benefits.split('\n').map((b) => b.trim()).filter(Boolean) };
      if (selectedPlan) { const { error } = await supabase.from('plans').update(payload).eq('id', selectedPlan.id); if (error) throw error; }
      else { const { error } = await supabase.from('plans').insert([payload]); if (error) throw error; }
      setPlanModal(false); fetchData();
    } catch (err: any) { setError(err.message ?? 'Something went wrong.'); } finally { setSaving(false); }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const { error } = await supabase.from('client_plans').insert([{ client_id: assignForm.client_id, plan_id: assignForm.plan_id, start_date: assignForm.start_date, total_amount: assignForm.total_amount, paid_amount: 0, status: 'active', service_ready: false }]);
      if (error) throw error;
      setAssignModal(false);
    } catch (err: any) { setError(err.message ?? 'Something went wrong.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    await supabase.from('plans').delete().eq('id', selectedPlan.id);
    setDeleteModal(false); setSaving(false); fetchData();
  };

  return (
    <div>
      <PageHero title="Plan Management" subtitle={`${plans.length} funeral life plans`} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Button onClick={openAddPlan} size="sm"><Plus size={15} /> Add Plan</Button>
        </div>

        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading plans...</div>
        ) : plans.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <FileText size={20} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>No plans yet</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Create your first funeral life plan</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {plans.map((plan) => (
              <Card key={plan.id} hover style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: 20, borderRadius: '8px 8px 0 0', background: typeGradient[plan.plan_type] ?? typeGradient.silver }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plan.plan_type} Plan</p>
                      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginTop: 4 }}>{plan.name}</h3>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 6 }}>{formatCurrency(plan.price)}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: plan.is_active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 6 }}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <CardBody style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{plan.description}</p>
                  {plan.benefits?.length > 0 && (
                    <div>
                      {plan.benefits.slice(0, 4).map((b, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                          <Check size={13} style={{ color: '#22c55e', marginTop: 2, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: '#4b5563' }}>{b}</span>
                        </div>
                      ))}
                      {plan.benefits.length > 4 && (
                        <p style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 19, marginTop: 2 }}>+{plan.benefits.length - 4} more benefits</p>
                      )}
                    </div>
                  )}
                </CardBody>

                <CardFooter>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="ghost" size="sm" onClick={() => openAssign(plan)} style={{ flex: 1 }}><Users size={14} /> Assign</Button>
                    <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)}><Pencil size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedPlan(plan); setDeleteModal(true); }}><Trash2 size={14} /></Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={planModal} onClose={() => setPlanModal(false)} title={selectedPlan ? 'Edit Plan' : 'Add New Plan'} size="lg">
        <form onSubmit={handleSavePlan} style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Input label="Plan Name" placeholder="e.g. Serenity Package" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
            <Select label="Plan Type" value={planForm.plan_type} onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value as Plan['plan_type'] })}>
              <option value="bronze">Bronze</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option>
            </Select>
            <Input label="Price (PHP)" type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })} required />
            <Select label="Status" value={planForm.is_active ? 'true' : 'false'} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.value === 'true' })}>
              <option value="true">Active</option><option value="false">Inactive</option>
            </Select>
          </div>
          <div style={{ marginBottom: 14 }}><Textarea label="Description" placeholder="Brief description of this plan..." value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} /></div>
          <div style={{ marginBottom: 14 }}><Textarea label="Benefits (one per line)" placeholder={"Casket\nEmbalming service\nFloral arrangement"} value={planForm.benefits} onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })} /></div>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14 }}><p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p></div>}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setPlanModal(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ flex: 1 }}>{selectedPlan ? 'Save Changes' : 'Create Plan'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title={`Assign "${selectedPlan?.name}" to Client`} size="md">
        <form onSubmit={handleAssign} style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}>
            <Select label="Select Client" value={assignForm.client_id} onChange={(e) => setAssignForm({ ...assignForm, client_id: e.target.value })} required>
              <option value="">Choose a client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Input label="Start Date" type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} required />
            <Input label="Total Amount (PHP)" type="number" min="0" step="0.01" value={assignForm.total_amount} onChange={(e) => setAssignForm({ ...assignForm, total_amount: parseFloat(e.target.value) || 0 })} required />
          </div>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14 }}><p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p></div>}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setAssignModal(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ flex: 1 }}>Assign Plan</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Plan" size="sm">
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 16 }}>Are you sure you want to delete <strong style={{ color: '#111827' }}>{selectedPlan?.name}</strong>?</p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => setDeleteModal(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={handleDelete} style={{ flex: 1 }}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
