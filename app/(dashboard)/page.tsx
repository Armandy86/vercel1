'use client';

import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { StatsCard } from '@/components/StatsCard';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import {
  Users,
  FileText,
  Banknote,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import type { Payment, ClientPlan } from '@/types';

interface Stats {
  total_clients: number;
  active_plans: number;
  total_collections: number;
  service_ready: number;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<Stats>({
    total_clients: 0,
    active_plans: 0,
    total_collections: 0,
    service_ready: 0,
  });
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [pendingPlans, setPendingPlans] = useState<ClientPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientsRes, plansRes, paymentsRes, serviceRes, recentPayRes, pendingRes] =
        await Promise.all([
          supabase.from('clients').select('id', { count: 'exact' }),
          supabase.from('client_plans').select('id', { count: 'exact' }).eq('status', 'active'),
          supabase.from('payments').select('amount'),
          supabase
            .from('client_plans')
            .select('id', { count: 'exact' })
            .eq('service_ready', true),
          supabase
            .from('payments')
            .select('*, client_plan:client_plans(*, client:clients(full_name), plan:plans(name))')
            .order('payment_date', { ascending: false })
            .limit(5),
          supabase
            .from('client_plans')
            .select('*, client:clients(full_name), plan:plans(name)')
            .eq('status', 'active')
            .eq('service_ready', false)
            .limit(5),
        ]);

      const totalCollections = (paymentsRes.data ?? []).reduce(
        (sum, p) => sum + (p.amount ?? 0),
        0
      );

      setStats({
        total_clients: clientsRes.count ?? 0,
        active_plans: plansRes.count ?? 0,
        total_collections: totalCollections,
        service_ready: serviceRes.count ?? 0,
      });
      setRecentPayments((recentPayRes.data as Payment[]) ?? []);
      setPendingPlans((pendingRes.data as ClientPlan[]) ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodLabel: Record<string, string> = {
    cash: 'Cash',
    gcash: 'GCash',
    bank_transfer: 'Bank Transfer',
    check: 'Check',
  };

  return (
    <div>
      <TopBar
        title="Dashboard"
        subtitle={`Welcome back, ${new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      <div className="p-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard
            title="Total Clients"
            value={loading ? '-' : stats.total_clients.toLocaleString()}
            subtitle="Registered clients"
            icon={<Users size={22} />}
            color="blue"
          />
          <StatsCard
            title="Active Plans"
            value={loading ? '-' : stats.active_plans.toLocaleString()}
            subtitle="Currently enrolled"
            icon={<FileText size={22} />}
            color="purple"
          />
          <StatsCard
            title="Total Collections"
            value={loading ? '-' : formatCurrency(stats.total_collections)}
            subtitle="All-time payments received"
            icon={<Banknote size={22} />}
            color="green"
          />
          <StatsCard
            title="Service Ready"
            value={loading ? '-' : stats.service_ready.toLocaleString()}
            subtitle="Plans ready for service"
            icon={<CheckCircle size={22} />}
            color="orange"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* Recent Payments */}
          <Card className="xl:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Recent Payments</h2>
                  <p className="text-sm text-gray-400 mt-0.5">Latest 5 payment transactions</p>
                </div>
                <TrendingUp size={18} className="text-gray-300" />
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : recentPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No payments recorded yet.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Banknote size={16} className="text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {(payment as any).client_plan?.client?.full_name ?? 'Unknown Client'}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {(payment as any).client_plan?.plan?.name ?? '-'} -{' '}
                            {formatDate(payment.payment_date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {paymentMethodLabel[payment.payment_method] ?? payment.payment_method}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Pending Service Readiness */}
          <Card className="xl:col-span-2">
            <CardHeader>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Needs Attention</h2>
                <p className="text-sm text-gray-400 mt-0.5">Plans not yet service-ready</p>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : pendingPlans.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">All plans are ready!</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {pendingPlans.map((cp) => {
                    const progress = cp.total_amount > 0
                      ? Math.min((cp.paid_amount / cp.total_amount) * 100, 100)
                      : 0;
                    return (
                      <div key={cp.id} className="px-6 py-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 truncate pr-2">
                            {(cp as any).client?.full_name ?? 'Unknown'}
                          </p>
                          <Badge
                            variant={progress >= 100 ? 'success' : 'warning'}
                            className="flex-shrink-0"
                          >
                            {progress.toFixed(0)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">
                          {(cp as any).plan?.name ?? '-'}
                        </p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-[#007AFF] h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
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
