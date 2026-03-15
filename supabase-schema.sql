-- =============================================
-- FunePlan Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- CLIENTS TABLE
-- =============================================
create table if not exists public.clients (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  email text,
  phone text,
  address text,
  date_of_birth date,
  status text not null default 'active' check (status in ('active', 'inactive', 'deceased')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- PLANS TABLE
-- =============================================
create table if not exists public.plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  price numeric(10, 2) not null default 0,
  plan_type text not null default 'silver' check (plan_type in ('bronze', 'silver', 'gold', 'platinum')),
  benefits text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- =============================================
-- CLIENT PLANS TABLE (Enrollment)
-- =============================================
create table if not exists public.client_plans (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  start_date date not null default current_date,
  total_amount numeric(10, 2) not null default 0,
  paid_amount numeric(10, 2) not null default 0,
  balance numeric(10, 2) generated always as (total_amount - paid_amount) stored,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled', 'on_hold')),
  service_ready boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
create table if not exists public.payments (
  id uuid default uuid_generate_v4() primary key,
  client_plan_id uuid not null references public.client_plans(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'gcash', 'bank_transfer', 'check')),
  reference_number text,
  notes text,
  created_at timestamptz default now()
);

-- =============================================
-- SERVICES TABLE (Service Readiness Checklist)
-- =============================================
create table if not exists public.services (
  id uuid default uuid_generate_v4() primary key,
  client_plan_id uuid not null references public.client_plans(id) on delete cascade,
  service_name text not null,
  is_ready boolean default false,
  notes text,
  checked_at timestamptz,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
alter table public.clients enable row level security;
alter table public.plans enable row level security;
alter table public.client_plans enable row level security;
alter table public.payments enable row level security;
alter table public.services enable row level security;

-- Allow authenticated users full access (admin-only system)
create policy "Authenticated users can do everything on clients"
  on public.clients for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on plans"
  on public.plans for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on client_plans"
  on public.client_plans for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on payments"
  on public.payments for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on services"
  on public.services for all using (auth.role() = 'authenticated');

-- =============================================
-- SAMPLE DATA (Optional - remove if not needed)
-- =============================================

-- Sample Plans
insert into public.plans (name, description, price, plan_type, benefits) values
  ('Basic Serenity', 'Essential funeral services for a dignified farewell', 15000, 'bronze', ARRAY['Simple casket', 'Embalming', 'Transportation', 'Death certificate processing']),
  ('Silver Comfort', 'Complete funeral package with additional services', 35000, 'silver', ARRAY['Premium casket', 'Full embalming', 'Hearse transportation', 'Floral arrangement', 'Funeral chapel (2 days)', 'Obituary publication']),
  ('Gold Prestige', 'Premium funeral experience with comprehensive services', 65000, 'gold', ARRAY['Luxury casket', 'Premium embalming', 'Hearse & family car', 'Premium florals', 'Funeral chapel (3 days)', 'Obituary (print & online)', 'Catering service', 'Memorial video']),
  ('Platinum Legacy', 'The finest funeral services for an unforgettable tribute', 120000, 'platinum', ARRAY['Masterpiece casket', 'Expert embalming', 'Full convoy', 'Premium floral design', 'Chapel (5 days)', 'National obituary', 'Full catering', 'Memorial video & album', 'Interment arrangement', 'Post-funeral support']);
