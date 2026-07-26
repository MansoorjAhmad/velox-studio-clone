-- ════════════════════════════════════════════════════════════════
--  VELOX STUDIO — LIFE & FINANCE TABLES
--  Run this in: Supabase Dashboard → SQL Editor → New query
--  Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
--  Assumes schema.sql (trades table) has already been run.
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
--  1. FINANCES — income, expenses, debts
-- ════════════════════════════════════════════════════════════════

-- Transactions (income + expenses in one table)
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('income', 'expense')),
  amount      numeric(12,2) not null,
  category    text not null,
  description text,
  date        date not null default current_date,
  recurring   text check (recurring in ('none','daily','weekly','monthly','yearly') or recurring is null) default 'none',
  created_at  timestamptz not null default now()
);
create index if not exists idx_tx_user_date on public.transactions (user_id, date desc);
create index if not exists idx_tx_user_type on public.transactions (user_id, type);

alter table public.transactions enable row level security;
drop policy if exists "transactions_select_own" on public.transactions;
drop policy if exists "transactions_insert_own" on public.transactions;
drop policy if exists "transactions_update_own" on public.transactions;
drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions for delete using (auth.uid() = user_id);

-- Debts
create table if not exists public.debts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  creditor      text,
  balance       numeric(12,2) not null,
  original_balance numeric(12,2),
  interest_rate numeric(5,2),
  min_payment   numeric(12,2),
  due_day       smallint check (due_day between 1 and 31),
  strategy      text check (strategy in ('avalanche','snowball','minimum') or strategy is null) default 'avalanche',
  is_paid_off   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_debts_user on public.debts (user_id);

alter table public.debts enable row level security;
drop policy if exists "debts_select_own" on public.debts;
drop policy if exists "debts_insert_own" on public.debts;
drop policy if exists "debts_update_own" on public.debts;
drop policy if exists "debts_delete_own" on public.debts;
create policy "debts_select_own" on public.debts for select using (auth.uid() = user_id);
create policy "debts_insert_own" on public.debts for insert with check (auth.uid() = user_id);
create policy "debts_update_own" on public.debts for update using (auth.uid() = user_id);
create policy "debts_delete_own" on public.debts for delete using (auth.uid() = user_id);

-- Debt payments
create table if not exists public.debt_payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  debt_id     uuid not null references public.debts(id) on delete cascade,
  amount      numeric(12,2) not null,
  payment_date date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_dp_user on public.debt_payments (user_id);
create index if not exists idx_dp_debt on public.debt_payments (debt_id);

alter table public.debt_payments enable row level security;
drop policy if exists "debt_payments_select_own" on public.debt_payments;
drop policy if exists "debt_payments_insert_own" on public.debt_payments;
drop policy if exists "debt_payments_update_own" on public.debt_payments;
drop policy if exists "debt_payments_delete_own" on public.debt_payments;
create policy "debt_payments_select_own" on public.debt_payments for select using (auth.uid() = user_id);
create policy "debt_payments_insert_own" on public.debt_payments for insert with check (auth.uid() = user_id);
create policy "debt_payments_update_own" on public.debt_payments for update using (auth.uid() = user_id);
create policy "debt_payments_delete_own" on public.debt_payments for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  2. GOALS
-- ════════════════════════════════════════════════════════════════

create table if not exists public.goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  category    text not null check (category in ('trading','health','work','personal','learning','finance')),
  period      text not null check (period in ('weekly','monthly')),
  period_key  text not null,
  target_value numeric(12,2),
  current_value numeric(12,2) default 0,
  unit        text default 'count',
  notes       text,
  completed   boolean not null default false,
  completed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_goals_user_period on public.goals (user_id, period, period_key);

alter table public.goals enable row level security;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_select_own" on public.goals for select using (auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  3. TIME — time tracking entries
-- ════════════════════════════════════════════════════════════════

create table if not exists public.time_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      text not null,
  description   text,
  start_time    timestamptz not null default now(),
  end_time      timestamptz,
  duration_minutes integer generated always as (
    case when end_time is not null
      then extract(epoch from (end_time - start_time))::integer / 60
      else null end
  ) stored,
  created_at    timestamptz not null default now()
);
create index if not exists idx_time_user_start on public.time_entries (user_id, start_time desc);

alter table public.time_entries enable row level security;
drop policy if exists "time_entries_select_own" on public.time_entries;
drop policy if exists "time_entries_insert_own" on public.time_entries;
drop policy if exists "time_entries_update_own" on public.time_entries;
drop policy if exists "time_entries_delete_own" on public.time_entries;
create policy "time_entries_select_own" on public.time_entries for select using (auth.uid() = user_id);
create policy "time_entries_insert_own" on public.time_entries for insert with check (auth.uid() = user_id);
create policy "time_entries_update_own" on public.time_entries for update using (auth.uid() = user_id);
create policy "time_entries_delete_own" on public.time_entries for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  4. TASKS
-- ════════════════════════════════════════════════════════════════

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  category     text not null check (category in ('trading','health','work','personal','learning','finance')) default 'personal',
  priority     text not null check (priority in ('low','medium','high','urgent')) default 'medium',
  status       text not null check (status in ('todo','in_progress','done')) default 'todo',
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_tasks_user_status on public.tasks (user_id, status);
create index if not exists idx_tasks_user_due on public.tasks (user_id, due_date);

alter table public.tasks enable row level security;
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on public.tasks for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on public.tasks for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on public.tasks for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  5. PROFILES — user display info
-- ════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text,
  display_name  text,
  account_type  text check (account_type in ('personal','prop','funded','live') or account_type is null),
  base_currency text default 'USD',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- ════════════════════════════════════════════════════════════════
--  6. ROUTINE — habit definitions + daily completion logs
-- ════════════════════════════════════════════════════════════════

-- Habit/template definitions (what the user does each day)
create table if not exists public.routine_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  time_slot   text,                             -- e.g. '05:00 AM'
  category    text not null check (category in ('deen','life','trading','work','growth')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_routine_items_user on public.routine_items (user_id, sort_order);

alter table public.routine_items enable row level security;
drop policy if exists "routine_items_select_own" on public.routine_items;
drop policy if exists "routine_items_insert_own" on public.routine_items;
drop policy if exists "routine_items_update_own" on public.routine_items;
drop policy if exists "routine_items_delete_own" on public.routine_items;
create policy "routine_items_select_own" on public.routine_items for select using (auth.uid() = user_id);
create policy "routine_items_insert_own" on public.routine_items for insert with check (auth.uid() = user_id);
create policy "routine_items_update_own" on public.routine_items for update using (auth.uid() = user_id);
create policy "routine_items_delete_own" on public.routine_items for delete using (auth.uid() = user_id);

-- Daily completion logs (one row per habit per day when completed)
create table if not exists public.routine_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     uuid references public.routine_items(id) on delete cascade,
  category    text not null check (category in ('deen','life','trading','work','growth')),
  log_date    date not null default current_date,
  created_at  timestamptz not null default now(),
  unique (user_id, item_id, log_date)           -- one completion per habit per day
);
create index if not exists idx_routine_logs_user_date on public.routine_logs (user_id, log_date desc);
create index if not exists idx_routine_logs_user_cat on public.routine_logs (user_id, category, log_date);

alter table public.routine_logs enable row level security;
drop policy if exists "routine_logs_select_own" on public.routine_logs;
drop policy if exists "routine_logs_insert_own" on public.routine_logs;
drop policy if exists "routine_logs_update_own" on public.routine_logs;
drop policy if exists "routine_logs_delete_own" on public.routine_logs;
create policy "routine_logs_select_own" on public.routine_logs for select using (auth.uid() = user_id);
create policy "routine_logs_insert_own" on public.routine_logs for insert with check (auth.uid() = user_id);
create policy "routine_logs_update_own" on public.routine_logs for update using (auth.uid() = user_id);
create policy "routine_logs_delete_own" on public.routine_logs for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  DONE. All tables ready with full RLS protection.
--  Tables created: transactions, debts, debt_payments, goals,
--                  time_entries, tasks, profiles,
--                  routine_items, routine_logs
-- ════════════════════════════════════════════════════════════════
