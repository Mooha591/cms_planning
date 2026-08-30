-- KyzenDay — schéma de l'onglet Planning (missions à venir) + RLS
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

create table if not exists public.planning (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null default 'journee',
  debut text,
  fin text,
  employeur text,
  secteur text,
  cms text,
  lieu text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planning_user_id_date_idx
  on public.planning (user_id, date);

-- Row Level Security : chacun ne voit / modifie que ses propres missions
alter table public.planning enable row level security;

drop policy if exists "Peut voir ses propres missions" on public.planning;
create policy "Peut voir ses propres missions"
  on public.planning for select
  using (auth.uid() = user_id);

drop policy if exists "Peut créer ses propres missions" on public.planning;
create policy "Peut créer ses propres missions"
  on public.planning for insert
  with check (auth.uid() = user_id);

drop policy if exists "Peut modifier ses propres missions" on public.planning;
create policy "Peut modifier ses propres missions"
  on public.planning for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Peut supprimer ses propres missions" on public.planning;
create policy "Peut supprimer ses propres missions"
  on public.planning for delete
  using (auth.uid() = user_id);
