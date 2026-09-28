-- Forja: notificaciones push. Ejecutar una vez en Supabase > SQL Editor > New query > Run.
-- push_subscriptions: dispositivos suscritos de cada usuario.
-- push_reminders: avisos que la app calcula para los próximos 7 días; la función send-reminders los envía.

create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now()
);

create table if not exists public.push_reminders (
  id      bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  at      timestamptz not null,
  title   text not null,
  body    text not null default '',
  tag     text,
  sent    boolean not null default false
);
create index if not exists push_reminders_due on public.push_reminders (sent, at);

alter table public.push_subscriptions enable row level security;
alter table public.push_reminders enable row level security;

-- Cada usuario solo ve y modifica lo suyo. La función de envío usa la service role y no pasa por estas políticas.
drop policy if exists "push_subs_own" on public.push_subscriptions;
create policy "push_subs_own" on public.push_subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "push_rem_own" on public.push_reminders;
create policy "push_rem_own" on public.push_reminders
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.push_reminders to authenticated;
grant usage, select on sequence public.push_reminders_id_seq to authenticated;
