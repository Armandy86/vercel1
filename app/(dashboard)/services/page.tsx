'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopBar } from '@/components/TopBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { CheckSquare, Square, Plus, Search, AlertCircle, CheckCircle2, Pencil } from 'lucide-react';
import type { ClientPlan, Service } from '@/types';

const DEFAULT_SERVICES = [
  'Casket / Urn',
  'Embalming Service',
  'Floral Arrangement',
  'Funeral Chapel',
  'Transportation / Hearse',
  'Death Certificate Processing',
  'Obituary Publication',
  'Interment / Cremation',
];

export default function ServicesPage() {
  const supabase = createClient();
  const [clientPlans, setClientPlans] = useState<ClientPlan[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ClientPlan | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [addServiceModal, setAddServiceModal] = useState(false);
  const [newService, setNewService] = useState({ service_name: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [plansRes, servicesRes] = await Promise.all([
      supabase
        .from('client_plans')
        .select('*, client:clients(full_name, phone), plan:plans(name, plan_type)')
        .in('status', ['active', 'completed'])
        .order('created_at', { ascending: false }),
      supabase.from('services').select('*'),
    ]);
    setClientPlans((plansRes.data ?? []) as ClientPlan[]);
    setServices((servicesRes.data ?? []) as Service[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPlanServices = (planId: string) =>
    services.filter((s) => s.client_plan_id === planId);

  const getReadinessPercent = (planId: string) => {
    const ps = getPlanServices(planId);
    if (ps.length === 0) return 0;
    return Math.round((ps.filter((s) => s.is_ready).length / ps.length) * 100);
  };

  const openPanel = (plan: ClientPlan) => {
    setSelectedPlan(plan);
    setPanelOpen(true);
  };

  const toggleService = async (service: Service) => {
    const newReady = !service.is_ready;
    await supabase
      .from('services')
      .update({ is_ready: newReady, checked_at: newReady ? new Date().toISOString() : null })
      .eq('id', service.id);

    // Update service_ready on client_plan
    const planServices = services.map((s) =>
      s.id === service.id ? { ...s, is_ready: newReady } : s
    );
    const planSvcs = planServices.filter((s) => s.client_plan_id === service.client_plan_id);
    const allReady = planSvcs.length > 0 && planSvcs.every((s) => s.is_ready);
    await supabase
      .from('client_plans')
      .update({ service_ready: allReady })
      .eq('id', service.client_plan_id);

    setServices(planServices);
    setClientPlans((prev) =>
      prev.map((p) =>
        p.id === service.client_plan_id ? { ...p, service_ready: allReady } : p
      )
    );
    if (selectedPlan?.id === service.client_plan_id) {
      setSelectedPlan((prev) => prev ? { ...prev, service_ready: allReady } : prev);
    }
  };

  const addDefaultServices = async (planId: string) => {
    setSaving(true);
    const existing = getPlanServices(planId).map((s) => s.service_name);
    const toAdd = DEFAULT_SERVICES.filter((s) => !existing.includes(s)).map((s) => ({
      client_plan_id: planId,
      service_name: s,
      is_ready: false,
      notes: '',
    }));
    if (toAdd.length > 0) {
      const { data } = await supabase.from('services').insert(toAdd).select();
      if (data) setServices((prev) => [...prev, ...(data as Service[])]);
    }
    setSaving(false);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !newService.service_name.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from('services')
      .insert([{ client_plan_id: selectedPlan.id, ...newService, is_ready: false }])
      .select()
      .single();
    if (data) setServices((prev) => [...prev, data as Service]);
    setNewService({ service_name: '', notes: '' });
    setAddServiceModal(false);
    setSaving(false);
  };

  const filtered = clientPlans.filter((cp) => {
    const name = (cp as any).client?.full_name ?? '';
    const plan = (cp as any).plan?.name ?? '';
    return name.toLowerCase().includes(search.toLowerCase()) || plan.toLowerCase().includes(search.toLowerCase());
  });

  const planTypeColors: Record<string, string> = {
    bronze: 'bg-amber-100 text-amber-700',
    silver: 'bg-gray-100 text-gray-600',
    gold: 'bg-yellow-100 text-yellow-700',
    platinum: 'bg-slate-100 text-slate-700',
  };

  const panelServices = selectedPlan ? getPlanServices(selectedPlan.id) : [];
  const panelReady = selectedPlan ? getReadinessPercent(selectedPlan.id) : 0;

  return (
    <div>
      <TopBar
        title="Service Readiness"
        subtitle="Monitor and track funeral service preparations"
      />

      <div className="p-8 space-y-6">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all shadow-sm"
          />
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-16">Loading service data...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CheckSquare size={20} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No active plans found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((cp) => {
              const pct = getReadinessPercent(cp.id);
              const planSvcs = getPlanServices(cp.id);
              const readyCount = planSvcs.filter((s) => s.is_ready).length;
              return (
                <Card key={cp.id} hover onClick={() => openPanel(cp)}>
                  <CardBody>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {getInitials((cp as any).client?.full_name ?? '?')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{(cp as any).client?.full_name ?? '-'}</p>
                          <p className="text-xs text-gray-400">{(cp as any).client?.phone ?? ''}</p>
                        </div>
                      </div>
                      {cp.service_ready ? (
                        <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertCircle size={18} className="text-yellow-500 flex-shrink-0" />
                      )}
                    </div>

                    <div className="mb-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planTypeColors[(cp as any).plan?.plan_type] ?? 'bg-gray-100 text-gray-600'}`}>
                        {(cp as any).plan?.name ?? '-'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Service Readiness</span>
                        <span className={`font-semibold ${pct === 100 ? 'text-green-600' : pct > 50 ? 'text-blue-600' : 'text-yellow-600'}`}>
                          {readyCount}/{planSvcs.length} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-[#007AFF]' : 'bg-yellow-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-400">
                      <span>Balance: {formatCurrency(cp.balance)}</span>
                      <span>{formatDate(cp.start_date)}</span>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Detail Panel Modal */}
      {selectedPlan && (
        <Modal isOpen={panelOpen} onClose={() => setPanelOpen(false)} title="Service Checklist" size="lg">
          <div className="p-6 space-y-5">
            {/* Client Info */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
              <div>
                <p className="font-semibold text-gray-900">{(selectedPlan as any).client?.full_name}</p>
                <p className="text-sm text-gray-400">{(selectedPlan as any).plan?.name}</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${panelReady === 100 ? 'text-green-600' : 'text-[#007AFF]'}`}>
                  {panelReady}%
                </p>
                <p className="text-xs text-gray-400">{panelServices.filter((s) => s.is_ready).length}/{panelServices.length} ready</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${panelReady === 100 ? 'bg-green-500' : 'bg-[#007AFF]'}`}
                style={{ width: `${panelReady}%` }}
              />
            </div>

            {/* Service Checklist */}
            {panelServices.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-3">No services added yet.</p>
                <Button size="sm" variant="secondary" onClick={() => addDefaultServices(selectedPlan.id)} loading={saving}>
                  Add Default Services
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {panelServices.map((svc) => (
                  <div
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 ${svc.is_ready ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-transparent hover:border-gray-200'}`}
                  >
                    {svc.is_ready ? (
                      <CheckSquare size={18} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <Square size={18} className="text-gray-300 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${svc.is_ready ? 'text-green-700 opacity-60' : 'text-gray-800'}`}>
                        {svc.service_name}
                      </p>
                      {svc.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{svc.notes}</p>}
                    </div>
                    {svc.is_ready && svc.checked_at && (
                      <span className="text-xs text-green-500 flex-shrink-0">{formatDate(svc.checked_at)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {panelServices.length === 0 && (
                <Button size="sm" variant="secondary" onClick={() => addDefaultServices(selectedPlan.id)} loading={saving} className="flex-1">
                  Add Default Services
                </Button>
              )}
              <Button size="sm" onClick={() => setAddServiceModal(true)} className={panelServices.length === 0 ? '' : 'flex-1'}>
                <Plus size={14} /> Add Service
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Service Modal */}
      <Modal isOpen={addServiceModal} onClose={() => setAddServiceModal(false)} title="Add Service Item" size="sm">
        <form onSubmit={handleAddService} className="p-6 space-y-4">
          <Input
            label="Service Name"
            placeholder="e.g. Casket"
            value={newService.service_name}
            onChange={(e) => setNewService({ ...newService, service_name: e.target.value })}
            required
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Any special instructions..."
            value={newService.notes}
            onChange={(e) => setNewService({ ...newService, notes: e.target.value })}
          />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setAddServiceModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={saving} className="flex-1">Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
