-- KyzenDay — schéma de la table des journées + sécurité par ligne (RLS)
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

create table if not exists public.entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null,
  debut text,
  fin text,
  debut2 text,
  fin2 text,
  pause integer not null default 0,
  heures numeric not null default 0,
  cms text,
  secteur text,
  km numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_user_id_date_idx
  on public.entries (user_id, date desc);

-- Row Level Security : chacun ne voit / modifie que ses propres journées
alter table public.entries enable row level security;

drop policy if exists "Peut voir ses propres journées" on public.entries;
create policy "Peut voir ses propres journées"
  on public.entries for select
  using (auth.uid() = user_id);

drop policy if exists "Peut créer ses propres journées" on public.entries;
create policy "Peut créer ses propres journées"
  on public.entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Peut modifier ses propres journées" on public.entries;
create policy "Peut modifier ses propres journées"
  on public.entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Peut supprimer ses propres journées" on public.entries;
create policy "Peut supprimer ses propres journées"
  on public.entries for delete
  using (auth.uid() = user_id);
