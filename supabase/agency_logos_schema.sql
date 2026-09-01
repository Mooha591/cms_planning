-- KyzenDay — logos des agences d'intérim (onglet journées)
-- Un logo par (utilisateur, employeur), image redimensionnée côté client
-- et stockée en data URL (base64) dans une colonne texte — pas de bucket
-- Storage à configurer.
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

create table if not exists public.agency_logos (
  id text primary key,               -- "<user_id>::<employeur>"
  user_id uuid not null references auth.users(id) on delete cascade,
  employeur text not null,
  data_url text not null,
  updated_at timestamptz not null default now()
);

create index if not exists agency_logos_user_idx
  on public.agency_logos (user_id);

alter table public.agency_logos enable row level security;

drop policy if exists "Peut voir ses propres logos" on public.agency_logos;
create policy "Peut voir ses propres logos"
  on public.agency_logos for select
  using (auth.uid() = user_id);

drop policy if exists "Peut créer ses propres logos" on public.agency_logos;
create policy "Peut créer ses propres logos"
  on public.agency_logos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Peut modifier ses propres logos" on public.agency_logos;
create policy "Peut modifier ses propres logos"
  on public.agency_logos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Peut supprimer ses propres logos" on public.agency_logos;
create policy "Peut supprimer ses propres logos"
  on public.agency_logos for delete
  using (auth.uid() = user_id);
