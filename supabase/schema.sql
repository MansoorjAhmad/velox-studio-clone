-- ════════════════════════════════════════════════════════════════
--  VELOX STUDIO — DATABASE SCHEMA
--  Run this in: Supabase Dashboard → SQL Editor → New query
--  Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
--  1. TRADES TABLE
-- ────────────────────────────────────────────────────────────────
create table if not exists public.trades (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Core trade data
  symbol          text not null,
  direction       text not null check (direction in ('LONG', 'SHORT')),
  entry_price     numeric(12,5) not null,
  exit_price      numeric(12,5),
  stop_loss       numeric(12,5),
  take_profit     numeric(12,5),
  quantity        numeric(12,5) not null default 1,
  pnl             numeric(12,2),              -- realized P&L in account currency
  r_multiple      numeric(8,2),               -- reward:risk multiple
  mae             numeric(12,5),              -- max adverse excursion
  mfe             numeric(12,5),              -- max favorable excursion

  -- Classification
  setup           text,                        -- e.g. 'Breakout', 'Pullback'
  session         text check (session in ('Asia', 'London', 'New York', 'Other') or session is null),
  market_condition text,                       -- e.g. 'Trending', 'Ranging'

  -- Psychology
  confidence      smallint check (confidence between 1 and 10),
  emotion_before  text[],                      -- e.g. {'calm','confident'}
  emotion_after   text[],
  mistakes        text[],                      -- self-tagged errors

  -- Partials & confluences (Phase 01)
  partials        jsonb,                       -- [{price, lots}, ...] multiple TP exits
  confluences     text[],                      -- e.g. {'FVG','Liquidity Sweep'}

  -- Notes & metadata
  notes           text,
  status          text not null default 'closed'
                  check (status in ('open', 'closed', 'breakeven')),

  -- Timestamps
  entry_time      timestamptz not null default now(),
  exit_time       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at on every change.
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.handle_updated_at();

-- Indexes for the common query patterns (list by user, sort by time).
create index if not exists idx_trades_user_entry_time
  on public.trades (user_id, entry_time desc);
create index if not exists idx_trades_user_symbol
  on public.trades (user_id, symbol);
create index if not exists idx_trades_user_setup
  on public.trades (user_id, setup);

-- ────────────────────────────────────────────────────────────────
--  2. ROW LEVEL SECURITY
--  Each user can only ever see / modify their own rows.
-- ────────────────────────────────────────────────────────────────
alter table public.trades enable row level security;

-- Allow users to see only their own trades.
drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own" on public.trades
  for select using (auth.uid() = user_id);

-- Allow users to insert only their own trades.
drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades
  for insert with check (auth.uid() = user_id);

-- Allow users to update only their own trades.
drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own" on public.trades
  for update using (auth.uid() = user_id);

-- Allow users to delete only their own trades.
drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own" on public.trades
  for delete using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
--  DONE. The `trades` table is ready with full RLS protection.
-- ════════════════════════════════════════════════════════════════
