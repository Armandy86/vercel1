# FunePlan - Funeral Life Plan Payment and Service Monitoring System

"Your sympathy is our success."

A modern web system built with Next.js 16 and Supabase for managing funeral life plan clients, monitoring payments, and tracking service readiness.

---

## Features

| Module | Description |
|---|---|
| Login | Secure admin authentication via Supabase Auth |
| Dashboard | Overview of clients, plans, payments, and service status |
| Client Management | Add, edit, and manage client information |
| Plan Management | Create funeral life plans and assign them to clients |
| Payment Monitoring | Record payments and track balances |
| Service Readiness | Checklist to track each plan's service preparations |
| Reports | Complete overview of all records with charts |

---

## Tech Stack

- Framework: Next.js 16 (App Router)
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Styling: Tailwind CSS v4
- Icons: Lucide React

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to supabase.com and create a new project
2. Copy your Project URL and Anon Key from Settings - API

### 2. Set Up the Database

1. Open the SQL Editor in your Supabase dashboard
2. Run the entire contents of supabase-schema.sql

### 3. Configure Environment Variables

Create a .env.local file in the root of this project:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Create an Admin User

1. In Supabase, go to Authentication - Users - Add user
2. Set an email and password for the admin account

### 5. Install and Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 and log in with your admin credentials.

---

## Project Structure

```
funeplan/
├── app/
│   ├── (auth)/login/       Login page
│   └── (dashboard)/        Protected dashboard
│       ├── page.tsx         Dashboard home
│       ├── clients/         Client management
│       ├── plans/           Plan management
│       ├── payments/        Payment monitoring
│       ├── services/        Service readiness
│       └── reports/         Reports
├── components/
│   ├── ui/                  Reusable UI components
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── StatsCard.tsx
├── lib/
│   ├── supabase/            Supabase client setup
│   └── utils.ts             Helper functions
├── types/index.ts           TypeScript interfaces
└── supabase-schema.sql      Database schema
```

---

Built for System Administration and Maintenance - Armandy Bollozos, T-32
