'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHead, TableBody, Th, Tr, Td } from '@/components/ui/Table';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import type { Client, Plan } from '@/types';

const emptyForm = {
  full_name: '', email: '', phone: '', address: '', date_of_birth: '', status: 'active' as Client['status'],
};

const emptyPlanAssign = {
  plan_id: '',
  start_date: new Date().toISOString().split('T')[0],
  total_amount: 0,
};

export default function ClientsPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planAssign, setPlanAssign] = useState(emptyPlanAssign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    const { data } = await supabase.from('plans').select('*').eq('is_active', true).order('name');
    setPlans((data ?? []) as Plan[]);
  }, [supabase]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
    setClients(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openAdd = () => {
    setSelectedClient(null);
    setForm(emptyForm);
    setPlanAssign({ ...emptyPlanAssign, start_date: new Date().toISOString().split('T')[0] });
    setError('');
    void fetchPlans();
    setModalOpen(true);
  };
  const openEdit = (c: Client) => {
    setSelectedClient(c);
    setForm({ full_name: c.full_name, email: c.email, phone: c.phone, address: c.address, date_of_birth: c.date_of_birth, status: c.status });
    setPlanAssign(emptyPlanAssign);
    setError('');
    setModalOpen(true);
  };
  const openDelete = (c: Client) => { setSelectedClient(c); setDeleteModalOpen(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (selectedClient) {
        const { error } = await supabase.from('clients').update({ ...form, updated_at: new Date().toISOString() }).eq('id', selectedClient.id);
        if (error) throw error;
      } else {
        const { data: inserted, error: insErr } = await supabase.from('clients').insert([form]).select('id').single();
        if (insErr) throw insErr;
        if (planAssign.plan_id && inserted?.id) {
          const { error: cpErr } = await supabase.from('client_plans').insert([
            {
              client_id: inserted.id,
              plan_id: planAssign.plan_id,
              start_date: planAssign.start_date,
              total_amount: planAssign.total_amount,
              paid_amount: 0,
              status: 'active',
              service_ready: false,
            },
          ]);
          if (cpErr) throw cpErr;
        }
      }
      setModalOpen(false); fetchClients();
    } catch (err: any) { setError(err.message ?? 'Something went wrong.'); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setSaving(true);
    await supabase.from('clients').delete().eq('id', selectedClient.id);
    setDeleteModalOpen(false); setSaving(false); fetchClients();
  };

  const filtered = clients.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const statusVariant: Record<string, 'success' | 'danger' | 'default'> = { active: 'success', inactive: 'default', deceased: 'danger' };

  return (
    <div>
      <PageHero title="Client Management" subtitle={`${clients.length} registered clients`} />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ position: 'relative', maxWidth: 280, width: '100%' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input className="fp-input" type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
          <Button onClick={openAdd} size="sm"><Plus size={15} /> Add Client</Button>
        </div>

        <Card>
          {loading ? (
            <div style={{ padding: 56, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading clients...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 56, textAlign: 'center' }}>
              <User size={20} style={{ color: '#d1d5db', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: '#6b7280' }}>No clients found</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Add your first client to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>Date of Birth</Th>
                <Th>Status</Th>
                <Th>Registered</Th>
                <Th>Actions</Th>
              </TableHead>
              <TableBody>
                {filtered.map((client) => (
                  <Tr key={client.id}>
                    <Td>
                      <Link
                        href={`/payments?client=${client.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          textDecoration: 'none',
                          color: 'inherit',
                          cursor: 'pointer',
                          borderRadius: 6,
                          margin: '-4px',
                          padding: '4px',
                        }}
                        title="Open payment monitor for this client"
                      >
                        <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#5C1A1A', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(client.full_name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#5C1A1A', margin: 0, textDecoration: 'underline', textDecorationColor: 'rgba(92,26,26,0.35)' }}>{client.full_name}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{client.email}</p>
                        </div>
                      </Link>
                    </Td>
                    <Td>
                      <p style={{ fontSize: 13, color: '#374151', margin: 0 }}>{client.phone}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.address}</p>
                    </Td>
                    <Td>{formatDate(client.date_of_birth)}</Td>
                    <Td><Badge variant={statusVariant[client.status] ?? 'default'}>{client.status.charAt(0).toUpperCase() + client.status.slice(1)}</Badge></Td>
                    <Td>{formatDate(client.created_at)}</Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => openEdit(client)} style={{ padding: 6, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}><Pencil size={14} /></button>
                        <button onClick={() => openDelete(client)} style={{ padding: 6, borderRadius: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af' }}><Trash2 size={14} /></button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedClient ? 'Edit Client' : 'Add New Client'} size="lg">
        <form onSubmit={handleSave} style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <Input label="Full Name" placeholder="Juan Dela Cruz" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            <Input label="Email Address" type="email" placeholder="juan@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone Number" placeholder="09XX-XXX-XXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Textarea label="Address" placeholder="Street, City, Province" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          {!selectedClient && (
            <div style={{ marginBottom: 14, padding: 14, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>Funeral plan</p>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 12px' }}>Pick a package to enroll this client now, or leave as none and assign later on Plans.</p>
              <Select
                label="Plan package"
                value={planAssign.plan_id}
                onChange={(e) => {
                  const id = e.target.value;
                  const p = plans.find((x) => x.id === id);
                  setPlanAssign({
                    plan_id: id,
                    start_date: planAssign.start_date,
                    total_amount: p ? p.price : 0,
                  });
                }}
              >
                <option value="">None</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.plan_type}) - {formatCurrency(p.price)}
                  </option>
                ))}
              </Select>
              {planAssign.plan_id ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                  <Input label="Plan start date" type="date" value={planAssign.start_date} onChange={(e) => setPlanAssign({ ...planAssign, start_date: e.target.value })} required />
                  <Input label="Total amount (PHP)" type="number" min="0" step="0.01" value={planAssign.total_amount || ''} onChange={(e) => setPlanAssign({ ...planAssign, total_amount: parseFloat(e.target.value) || 0 })} required />
                </div>
              ) : null}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Client['status'] })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deceased">Deceased</option>
            </Select>
          </div>
          {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 14 }}><p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p></div>}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button type="submit" loading={saving} style={{ flex: 1 }}>{selectedClient ? 'Save Changes' : 'Add Client'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Client" size="sm">
        <div style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 16 }}>
            Are you sure you want to delete <strong style={{ color: '#111827' }}>{selectedClient?.full_name}</strong>? This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} style={{ flex: 1 }}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={handleDelete} style={{ flex: 1 }}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
