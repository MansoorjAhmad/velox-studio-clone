-- The earlier Zenith-history migration was not applied in this project.
-- Create its base table first; this is a no-op if it already exists.
create table if not exists public.zenith_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'agent')),
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.zenith_messages enable row level security;
drop policy if exists "Users manage own Zenith messages" on public.zenith_messages;
create policy "Users manage own Zenith messages"
  on public.zenith_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.zenith_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_zenith_conversations_user on public.zenith_conversations (user_id, updated_at desc);
alter table public.zenith_conversations enable row level security;
drop policy if exists "Users manage own conversations" on public.zenith_conversations;
create policy "Users manage own conversations" on public.zenith_conversations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists zenith_conversations_updated_at on public.zenith_conversations;
create trigger zenith_conversations_updated_at before update on public.zenith_conversations for each row execute function public.handle_updated_at();

alter table public.zenith_messages add column if not exists conversation_id uuid references public.zenith_conversations(id) on delete cascade;
create index if not exists idx_zenith_messages_conversation on public.zenith_messages (conversation_id, created_at asc);

do $$
declare u record; new_conv_id uuid;
begin
  for u in select distinct user_id from public.zenith_messages where conversation_id is null loop
    insert into public.zenith_conversations (user_id, title) values (u.user_id, 'Previous chat') returning id into new_conv_id;
    update public.zenith_messages set conversation_id = new_conv_id where user_id = u.user_id and conversation_id is null;
  end loop;
end $$;

alter table public.zenith_messages alter column conversation_id set not null;
