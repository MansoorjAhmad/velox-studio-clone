alter table public.trades
  add column if not exists pre_trade_analysis text,
  add column if not exists post_trade_review text,
  add column if not exists lessons_learned text,
  add column if not exists execution_checklist jsonb not null default '[]'::jsonb,
  add column if not exists screenshot_urls text[] not null default '{}',
  add column if not exists journaled_at timestamptz;

insert into storage.buckets (id, name, public)
values ('trade-screenshots', 'trade-screenshots', false)
on conflict (id) do nothing;

drop policy if exists "Users manage own trade screenshots" on storage.objects;
create policy "Users manage own trade screenshots"
on storage.objects for all to authenticated
using (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'trade-screenshots' and auth.uid()::text = (storage.foldername(name))[1]);
