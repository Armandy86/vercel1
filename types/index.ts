export interface Client {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  status: 'active' | 'inactive' | 'deceased';
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  benefits: string[];
  plan_type: 'bronze' | 'silver' | 'gold' | 'platinum';
  is_active: boolean;
  created_at: string;
}

export interface ClientPlan {
  id: string;
  client_id: string;
  plan_id: string;
  start_date: string;
  total_amount: number;
  paid_amount: number;
  balance: number;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  service_ready: boolean;
  created_at: string;
  client?: Client;
  plan?: Plan;
}

export interface Payment {
  id: string;
  client_plan_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'gcash' | 'bank_transfer' | 'check';
  reference_number: string;
  notes: string;
  created_at: string;
  client_plan?: ClientPlan;
}

export interface Service {
  id: string;
  client_plan_id: string;
  service_name: string;
  is_ready: boolean;
  notes: string;
  checked_at: string | null;
  created_at: string;
  client_plan?: ClientPlan;
}

export interface DashboardStats {
  total_clients: number;
  active_plans: number;
  total_collections: number;
  service_ready: number;
  recent_payments: Payment[];
  payment_status_breakdown: { status: string; count: number }[];
  monthly_collections: { month: string; amount: number }[];
}
