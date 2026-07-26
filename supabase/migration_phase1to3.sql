-- ═══════════════════════════════════════════════════════════════
--  VELOX STUDIO — MIGRATION: Phase 01 → 03
--  Run in Supabase Dashboard → SQL Editor → New query
--  Safe to re-run (all use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════

-- ── PHASE 01: Trade Log Core ──────────────────────────────────────

-- 1a. Partials: JSONB array of {price, lots} for partial TP exits
alter table public.trades add column if not exists partials jsonb;
-- Stores: [{"price": 2060.00, "lots": 0.5}, {"price": 2065.00, "lots": 0.3}]

-- 1b. Confluences: text[] for confluence tags
alter table public.trades add column if not exists confluences text[];
-- Stores: {'Fib Golden Zone', 'FVG', 'Liquidity Sweep'}

-- ── PHASE 03: Goals — quarterly + annual periods ──────────────────

alter table public.goals drop constraint if exists goals_period_check;
alter table public.goals add constraint goals_period_check
  check (period in ('weekly','monthly','quarterly','annual'));

-- ── PHASE 03: Debts module rebuild ────────────────────────────────

-- Type: 'i_owe' (liability) or 'owed_to_me' (asset)
alter table public.debts add column if not exists type text
  default 'i_owe' check (type in ('i_owe','owed_to_me'));

-- Clearer amount tracking
alter table public.debts add column if not exists total_amount numeric(12,2);
alter table public.debts add column if not exists paid_amount numeric(12,2) default 0;
alter table public.debts add column if not exists notes text;
alter table public.debts add column if not exists category text;

-- Backfill: if total_amount is null, copy from old 'amount' column (if it exists)
do $$ begin
  if exists (select 1 from information_schema.columns
              where table_name='debts' and column_name='amount') then
    update public.debts set total_amount = amount where total_amount is null;
  end if;
  if exists (select 1 from information_schema.columns
              where table_name='debts' and column_name='paid') then
    update public.debts set paid_amount = paid where paid_amount = 0;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════
--  DONE. All Phase 01-03 schema changes applied.
-- ═══════════════════════════════════════════════════════════════
