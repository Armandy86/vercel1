'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHero } from '@/components/PageHero';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { CheckSquare, Square, Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ClientPlan, Service } from '@/types';

const DEFAULT_SERVICES = [
  'Casket / Urn', 'Embalming Service', 'Floral Arrangement', 'Funeral Chapel',
  'Transportation / Hearse', 'Death Certificate Processing', 'Obituary Publication', 'Interment / Cremation',
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
      supabase.from('client_plans').select('*, client:clients(full_name, phone), plan:plans(name, plan_type)').in('status', ['active', 'completed']).order('created_at', { ascending: false }),
      supabase.from('services').select('*'),
    ]);
    setClientPlans((plansRes.data ?? []) as ClientPlan[]);
    setServices((servicesRes.data ?? []) as Service[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPlanServices = (id: string) => services.filter((s) => s.client_plan_id === id);
  const getReadinessPercent = (id: string) => { const ps = getPlanServices(id); if (!ps.length) return 0; return Math.round((ps.filter((s) => s.is_ready).length / ps.length) * 100); };

  const toggleService = async (service: Service) => {
    const newReady = !service.is_ready;
    await supabase.from('services').update({ is_ready: newReady, checked_at: newReady ? new Date().toISOString() : null }).eq('id', service.id);
    const planServices = services.map((s) => s.id === service.id ? { ...s, is_ready: newReady } : s);
    const planSvcs = planServices.filter((s) => s.client_plan_id === service.client_plan_id);
    const allReady = planSvcs.length > 0 && planSvcs.every((s) => s.is_ready);
    await supabase.from('client_plans').update({ service_ready: allReady }).eq('id', service.client_plan_id);
    setServices(planServices);
    setClientPlans((prev) => prev.map((p) => p.id === service.client_plan_id ? { ...p, service_ready: allReady } : p));
    if (selectedPlan?.id === service.client_plan_id) setSelectedPlan((prev) => prev ? { ...prev, service_ready: allReady } : prev);
  };

  const addDefaultServices = async (planId: string) => {
    setSaving(true);
    const existing = getPlanServices(planId).map((s) => s.service_name);
    const toAdd = DEFAULT_SERVICES.filter((s) => !existing.includes(s)).map((s) => ({ client_plan_id: planId, service_name: s, is_ready: false, notes: '' }));
    if (toAdd.length > 0) { const { data } = await supabase.from('services').insert(toAdd).select(); if (data) setServices((prev) => [...prev, ...(data as Service[])]); }
    setSaving(false);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !newService.service_name.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('services').insert([{ client_plan_id: selectedPlan.id, ...newService, is_ready: false }]).select().single();
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

  const panelServices = selectedPlan ? getPlanServices(selectedPlan.id) : [];
  const panelReady = selectedPlan ? getReadinessPercent(selectedPlan.id) : 0;

  return (
    <div>
      <PageHero title="Service Readiness" subtitle="Monitor and track funeral service preparations" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ position: 'relative', maxWidth: 280, marginBottom: 24 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input className="fp-input" type="text" placeholder="Search by client or plan..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
        </div>

        {loading ? (
          <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading service data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 56, textAlign: 'center' }}>
            <CheckSquare size={20} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>No active plans found</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {filtered.map((cp) => {
              const pct = getReadinessPercent(cp.id);
              const planSvcs = getPlanServices(cp.id);
              const readyCount = planSvcs.filter((s) => s.is_ready).length;
              return (
                <Card key={cp.id} hover onClick={() => { setSelectedPlan(cp); setPanelOpen(true); }}>
                  <CardBody>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#5C1A1A', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials((cp as any).client?.full_name ?? '?')}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{(cp as any).client?.full_name ?? '-'}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{(cp as any).client?.phone ?? ''}</p>
                        </div>
                      </div>
                      {cp.service_ready ? <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} /> : <AlertCircle size={18} style={{ color: '#eab308', flexShrink: 0 }} />}
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Badge variant={cp.service_ready ? 'success' : 'info'}>{(cp as any).plan?.name ?? '-'}</Badge>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: '#6b7280' }}>Service Readiness</span>
                        <span style={{ fontWeight: 600, color: pct === 100 ? '#16a34a' : pct > 50 ? '#2563eb' : '#ca8a04' }}>{readyCount}/{planSvcs.length} ({pct}%)</span>
                      </div>
                      <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 9999, height: 6 }}>
                        <div style={{ width: `${pct}%`, height: 6, borderRadius: 9999, background: pct === 100 ? '#22c55e' : '#5C1A1A', transition: 'width 0.5s' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', fontSize: 11, color: '#9ca3af' }}>
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

      {selectedPlan && (
        <Modal isOpen={panelOpen} onClose={() => setPanelOpen(false)} title="Service Checklist" size="lg">
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#f9fafb', borderRadius: 8, marginBottom: 16 }}>
              <div>
                <p style={{ fontWeight: 600, color: '#111827', margin: 0 }}>{(selectedPlan as any).client?.full_name}</p>
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>{(selectedPlan as any).plan?.name}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 20, fontWeight: 700, color: panelReady === 100 ? '#16a34a' : '#5C1A1A', margin: 0 }}>{panelReady}%</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{panelServices.filter((s) => s.is_ready).length}/{panelServices.length} ready</p>
              </div>
            </div>

            <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 9999, height: 8, marginBottom: 20 }}>
              <div style={{ width: `${panelReady}%`, height: 8, borderRadius: 9999, background: panelReady === 100 ? '#22c55e' : '#5C1A1A', transition: 'width 0.5s' }} />
            </div>

            {panelServices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 12 }}>No services added yet.</p>
                <Button size="sm" variant="secondary" onClick={() => addDefaultServices(selectedPlan.id)} loading={saving}>Add Default Services</Button>
              </div>
            ) : (
              <div>
                {panelServices.map((svc) => (
                  <div
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 8,
                      cursor: 'pointer', marginBottom: 6, transition: 'background 0.15s',
                      background: svc.is_ready ? '#f0fdf4' : '#f9fafb',
                      border: svc.is_ready ? '1px solid #bbf7d0' : '1px solid transparent',
                    }}
                  >
                    {svc.is_ready ? <CheckSquare size={18} style={{ color: '#22c55e', flexShrink: 0 }} /> : <Square size={18} style={{ color: '#d1d5db', flexShrink: 0 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: svc.is_ready ? '#166534' : '#374151', margin: 0, opacity: svc.is_ready ? 0.7 : 1 }}>{svc.service_name}</p>
                      {svc.notes && <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{svc.notes}</p>}
                    </div>
                    {svc.is_ready && svc.checked_at && <span style={{ fontSize: 11, color: '#22c55e', flexShrink: 0 }}>{formatDate(svc.checked_at)}</span>}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              {panelServices.length === 0 && <Button size="sm" variant="secondary" onClick={() => addDefaultServices(selectedPlan.id)} loading={saving} style={{ flex: 1 }}>Add Default Services</Button>}
              <Button size="sm" onClick={() => setAddServiceModal(true)} style={{ flex: panelServices.length === 0 ? undefined : 1 }}><Plus size={14} /> Add Service</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal isOpen={addServiceModal} onClose={() => setAddServiceModal(false)} title="Add Service Item" size="sm">
        <form onSubmit={handleAddService} style={{ padding: 20 }}>
          <div style={{ marginBottom: 14 }}><Input label="Service Name" placeholder="e.g. Casket" value={newService.service_name} onChange={(e) => setNewService({ ...newService, service_name: e.target.value })} required /></div>
          <div style={{ marginBottom: 14 }}><Textarea label="Notes (optional)" placeholder="Any special instructions..." value={newService.notes} onChange={(e) => setNewService({ ...newService, notes: e.target.value })} /></div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button type="button" variant="secondary" onClick={() => setAddServiceModal(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ flex: 1 }}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
