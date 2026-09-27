-- Forja: tabla de estado por cuenta con Row Level Security.
-- Ejecutar en Supabase > SQL Editor > New query > Run.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Cada usuario solo puede ver y modificar su propia fila.
drop policy if exists "app_state_select_own" on public.app_state;
drop policy if exists "app_state_insert_own" on public.app_state;
drop policy if exists "app_state_update_own" on public.app_state;
drop policy if exists "app_state_delete_own" on public.app_state;

create policy "app_state_select_own" on public.app_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "app_state_insert_own" on public.app_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "app_state_update_own" on public.app_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "app_state_delete_own" on public.app_state
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.app_state to authenticated;
