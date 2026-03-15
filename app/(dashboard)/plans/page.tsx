'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getPlanTypeColor } from '@/lib/utils';
import { Plus, Pencil, Trash2, FileText, Check, Users } from 'lucide-react';
import type { Plan, Client, ClientPlan } from '@/types';

const emptyPlanForm = {
  name: '',
  description: '',
  price: 0,
  plan_type: 'silver' as Plan['plan_type'],
  is_active: true,
  benefits: '',
};

const emptyAssignForm = {
  client_id: '',
  plan_id: '',
  start_date: new Date().toISOString().split('T')[0],
  total_amount: 0,
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
    setClients(clientsRes.data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAddPlan = () => {
    setSelectedPlan(null);
    setPlanForm(emptyPlanForm);
    setError('');
    setPlanModal(true);
  };

  const openEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      plan_type: plan.plan_type,
      is_active: plan.is_active,
      benefits: plan.benefits?.join('\n') ?? '',
    });
    setError('');
    setPlanModal(true);
  };

  const openAssign = (plan: Plan) => {
    setSelectedPlan(plan);
    setAssignForm({ ...emptyAssignForm, plan_id: plan.id, total_amount: plan.price });
    setError('');
    setAssignModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...planForm,
        benefits: planForm.benefits.split('\n').map((b) => b.trim()).filter(Boolean),
      };
      if (selectedPlan) {
        const { error } = await supabase.from('plans').update(payload).eq('id', selectedPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert([payload]);
        if (error) throw error;
      }
      setPlanModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        client_id: assignForm.client_id,
        plan_id: assignForm.plan_id,
        start_date: assignForm.start_date,
        total_amount: assignForm.total_amount,
        paid_amount: 0,
        status: 'active',
        service_ready: false,
      };
      const { error } = await supabase.from('client_plans').insert([payload]);
      if (error) throw error;
      setAssignModal(false);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    await supabase.from('plans').delete().eq('id', selectedPlan.id);
    setDeleteModal(false);
    setSaving(false);
    fetchData();
  };

  const planTypeColors: Record<string, string> = {
    bronze: 'from-amber-400 to-amber-600',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-slate-400 to-slate-600',
  };

  return (
    <div>
      <TopBar
        title="Plan Management"
        subtitle={`${plans.length} funeral life plans`}
        actions={
          <Button onClick={openAddPlan} size="sm">
            <Plus size={16} /> Add Plan
          </Button>
        }
      />

      <div className="p-8">
        {loading ? (
          <div className="text-center text-gray-400 text-sm py-16">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No plans yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first funeral life plan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {plans.map((plan) => (
              <Card key={plan.id} hover className="flex flex-col">
                {/* Plan Header */}
                <div className={`bg-gradient-to-br ${planTypeColors[plan.plan_type] ?? 'from-blue-400 to-blue-600'} rounded-t-2xl p-5`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/70 text-xs font-medium uppercase tracking-wider">
                        {plan.plan_type} Plan
                      </p>
                      <h3 className="text-xl font-bold text-white mt-1">{plan.name}</h3>
                      <p className="text-white/80 text-2xl font-bold mt-2">
                        {formatCurrency(plan.price)}
                      </p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-lg ${plan.is_active ? 'bg-white/20' : 'bg-black/20'}`}>
                      <span className="text-white text-xs font-medium">
                        {plan.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <CardBody className="flex-1">
                  <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
                  {plan.benefits?.length > 0 && (
                    <div className="space-y-1.5">
                      {plan.benefits.slice(0, 4).map((benefit, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-600">{benefit}</span>
                        </div>
                      ))}
                      {plan.benefits.length > 4 && (
                        <p className="text-xs text-gray-400 pl-5">
                          +{plan.benefits.length - 4} more benefits
                        </p>
                      )}
                    </div>
                  )}
                </CardBody>

                <CardFooter>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAssign(plan)}
                      className="flex-1"
                    >
                      <Users size={14} /> Assign
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditPlan(plan)}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSelectedPlan(plan); setDeleteModal(true); }}
                      className="hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Plan Modal */}
      <Modal isOpen={planModal} onClose={() => setPlanModal(false)} title={selectedPlan ? 'Edit Plan' : 'Add New Plan'} size="lg">
        <form onSubmit={handleSavePlan} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Plan Name" placeholder="e.g. Serenity Package" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} required />
            <Select label="Plan Type" value={planForm.plan_type} onChange={(e) => setPlanForm({ ...planForm, plan_type: e.target.value as Plan['plan_type'] })}>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </Select>
            <Input label="Price (PHP)" type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })} required />
            <Select label="Status" value={planForm.is_active ? 'true' : 'false'} onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.value === 'true' })}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
          <Textarea label="Description" placeholder="Brief description of this plan..." value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} />
          <Textarea label="Benefits (one per line)" placeholder="Casket&#10;Embalming service&#10;Floral arrangement&#10;..." value={planForm.benefits} onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })} rows={5} />
          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setPlanModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">{selectedPlan ? 'Save Changes' : 'Create Plan'}</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Plan Modal */}
      <Modal isOpen={assignModal} onClose={() => setAssignModal(false)} title={`Assign "${selectedPlan?.name}" to Client`} size="md">
        <form onSubmit={handleAssign} className="p-6 space-y-4">
          <Select label="Select Client" value={assignForm.client_id} onChange={(e) => setAssignForm({ ...assignForm, client_id: e.target.value })} required>
            <option value="">Choose a client...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
          <Input label="Start Date" type="date" value={assignForm.start_date} onChange={(e) => setAssignForm({ ...assignForm, start_date: e.target.value })} required />
          <Input label="Total Amount (PHP)" type="number" min="0" step="0.01" value={assignForm.total_amount} onChange={(e) => setAssignForm({ ...assignForm, total_amount: parseFloat(e.target.value) || 0 })} required />
          {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setAssignModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Assign Plan</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Plan" size="sm">
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold text-gray-900">{selectedPlan?.name}</span>?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModal(false)} className="flex-1">Cancel</Button>
            <Button variant="danger" loading={saving} onClick={handleDelete} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
