'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHero } from '@/components/PageHero';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Payment, ClientPlan } from '@/types';

interface Stats { total_clients: number; assigned_plans: number; total_collections: number; service_ready: number; }

const quickLinks = [
  { href: '/clients', label: 'Clients', desc: 'Manage client records' },
  { href: '/plans', label: 'Plans', desc: 'Plans and assignments' },
  { href: '/payments', label: 'Payments', desc: 'Record and track' },
  { href: '/services', label: 'Services', desc: 'Service readiness' },
  { href: '/reports', label: 'Reports', desc: 'View reports' },
];

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({ total_clients: 0, assigned_plans: 0, total_collections: 0, service_ready: 0 });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [pendingPlans, setPendingPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, plansRes, paymentsRes, serviceRes, recentPayRes, pendingRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        // Count all assigned plans except cancelled (completed still counts; fully paid plans become "completed")
        supabase.from('client_plans').select('id', { count: 'exact' }).neq('status', 'cancelled'),
        supabase.from('payments').select('amount'),
        supabase.from('client_plans').select('id', { count: 'exact' }).eq('service_ready', true),
        supabase.from('payments').select('*, client_plan:client_plans(*, client:clients(full_name), plan:plans(name))').order('payment_date', { ascending: false }).limit(5),
        supabase.from('client_plans').select('*, client:clients(full_name), plan:plans(name)').eq('status', 'active').eq('service_ready', false).limit(5),
      ]);
      const totalCollections = (paymentsRes.data ?? []).reduce((sum, p) => sum + (p.amount ?? 0), 0);
      setStats({ total_clients: clientsRes.count ?? 0, assigned_plans: plansRes.count ?? 0, total_collections: totalCollections, service_ready: serviceRes.count ?? 0 });
      setRecentPayments((recentPayRes.data as Payment[]) ?? []);
      setPendingPlans((pendingRes.data as ClientPlan[]) ?? []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const methodLabel: Record<string, string> = { cash: 'Cash', gcash: 'GCash', bank_transfer: 'Bank Transfer', check: 'Check' };

  return (
    <div>
      <PageHero
        title="Dashboard"
        subtitle={`Welcome back - ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      {/* Quick links */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {quickLinks.map(({ href, label, desc }, i) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '18px 8px', textAlign: 'center', textDecoration: 'none',
                  borderLeft: i > 0 ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{desc}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatsCard title="Total Clients" value={loading ? '-' : stats.total_clients.toLocaleString()} subtitle="Registered" />
          <StatsCard title="Assigned plans" value={loading ? '-' : stats.assigned_plans.toLocaleString()} subtitle="Active, completed, or on hold" />
          <StatsCard title="Total Collections" value={loading ? '-' : formatCurrency(stats.total_collections)} subtitle="All-time" />
          <StatsCard title="Service Ready" value={loading ? '-' : stats.service_ready.toLocaleString()} subtitle="Ready" />
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
          <Card>
            <CardHeader>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Recent Payments</span>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {loading ? (
                <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</p>
              ) : recentPayments.length === 0 ? (
                <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No payments recorded yet.</p>
              ) : (
                <div>
                  {recentPayments.map((payment, i) => (
                    <div
                      key={payment.id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 20px',
                        borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>
                          {(payment as any).client_plan?.client?.full_name ?? 'Unknown'}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
                          {(payment as any).client_plan?.plan?.name ?? '-'} - {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>{formatCurrency(payment.amount)}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{methodLabel[payment.payment_method] ?? payment.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Needs Attention</span>
              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, marginTop: 2 }}>Plans not yet service-ready</p>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {loading ? (
                <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loading...</p>
              ) : pendingPlans.length === 0 ? (
                <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>All plans are ready.</p>
              ) : (
                <div>
                  {pendingPlans.map((cp, i) => {
                    const progress = cp.total_amount > 0 ? Math.min((cp.paid_amount / cp.total_amount) * 100, 100) : 0;
                    return (
                      <div key={cp.id} style={{ padding: '12px 20px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0 }}>{(cp as any).client?.full_name ?? 'Unknown'}</p>
                          <Badge variant={progress >= 100 ? 'success' : 'warning'}>{progress.toFixed(0)}%</Badge>
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 6px' }}>{(cp as any).plan?.name ?? '-'}</p>
                        <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 9999, height: 6 }}>
                          <div style={{ width: `${progress}%`, height: 6, borderRadius: 9999, background: '#5C1A1A', transition: 'width 0.5s' }} />
                        </div>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                          {formatCurrency(cp.paid_amount)} / {formatCurrency(cp.total_amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
