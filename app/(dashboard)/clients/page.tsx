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
import { formatDate, getInitials, getStatusColor } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import type { Client } from '@/types';

const emptyForm = {
  full_name: '',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  status: 'active' as Client['status'],
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    setClients(data ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const openAdd = () => {
    setSelectedClient(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (client: Client) => {
    setSelectedClient(client);
    setForm({
      full_name: client.full_name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      date_of_birth: client.date_of_birth,
      status: client.status,
    });
    setError('');
    setModalOpen(true);
  };

  const openDelete = (client: Client) => {
    setSelectedClient(client);
    setDeleteModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (selectedClient) {
        const { error } = await supabase
          .from('clients')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', selectedClient.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clients').insert([form]);
        if (error) throw error;
      }
      setModalOpen(false);
      fetchClients();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setSaving(true);
    await supabase.from('clients').delete().eq('id', selectedClient.id);
    setDeleteModalOpen(false);
    setSaving(false);
    fetchClients();
  };

  const filtered = clients.filter(
    (c) =>
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const statusVariant: Record<string, 'success' | 'danger' | 'default'> = {
    active: 'success',
    inactive: 'default',
    deceased: 'danger',
  };

  return (
    <div>
      <TopBar
        title="Client Management"
        subtitle={`${clients.length} registered clients`}
        actions={
          <Button onClick={openAdd} size="sm">
            <Plus size={16} /> Add Client
          </Button>
        }
      />

      <div className="p-8">
        <Card>
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-50">
            <div className="relative max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-gray-400 text-sm">Loading clients...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <User size={20} className="text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No clients found</p>
              <p className="text-gray-400 text-sm mt-1">Add your first client to get started</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <Th>Client</Th>
                <Th>Contact</Th>
                <Th>Date of Birth</Th>
                <Th>Status</Th>
                <Th>Registered</Th>
                <Th className="text-right">Actions</Th>
              </TableHead>
              <TableBody>
                {filtered.map((client) => (
                  <Tr key={client.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {getInitials(client.full_name)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.full_name}</p>
                          <p className="text-xs text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <p className="text-gray-700">{client.phone}</p>
                      <p className="text-xs text-gray-400 truncate max-w-xs">{client.address}</p>
                    </Td>
                    <Td>{formatDate(client.date_of_birth)}</Td>
                    <Td>
                      <Badge variant={statusVariant[client.status] ?? 'default'}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </Badge>
                    </Td>
                    <Td>{formatDate(client.created_at)}</Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(client)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => openDelete(client)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedClient ? 'Edit Client' : 'Add New Client'}
        size="lg"
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Juan Dela Cruz"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="juan@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="09XX-XXX-XXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label="Date of Birth"
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <Textarea
            label="Address"
            placeholder="Street, City, Province"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Client['status'] })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="deceased">Deceased</option>
          </Select>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="flex-1">
              {selectedClient ? 'Save Changes' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Client"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{selectedClient?.full_name}</span>?
            This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" loading={saving} onClick={handleDelete} className="flex-1">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
