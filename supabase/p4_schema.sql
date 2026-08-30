-- KyzenDay — Puissance 4 en ligne (onglet Chill)
-- Table partagée unique (une seule partie « main ») : deux personnes
-- connectées au site prennent chacune une couleur et jouent en temps
-- réel. Purement pour le fun, aucune donnée sensible.
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run

create table if not exists public.p4_game (
  id text primary key default 'main',
  board jsonb not null default
    '[null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb,
  turn text not null default 'R' check (turn in ('R', 'Y')),
  red_id uuid references auth.users(id) on delete set null,
  red_name text,
  yellow_id uuid references auth.users(id) on delete set null,
  yellow_name text,
  winner text check (winner in ('R', 'Y', 'draw')),
  updated_at timestamptz not null default now()
);

-- La ligne unique de la partie partagée
insert into public.p4_game (id) values ('main') on conflict (id) do nothing;

-- Realtime : payload complet sur les UPDATE + diffusion de la table
alter table public.p4_game replica identity full;
alter publication supabase_realtime add table public.p4_game;

-- RLS : toute personne authentifiée peut lire la table et y jouer.
-- (Pas d'insert / delete : la ligne « main » est créée ci-dessus et ne
-- bouge plus.)
alter table public.p4_game enable row level security;

drop policy if exists "Puissance 4 — lecture" on public.p4_game;
create policy "Puissance 4 — lecture"
  on public.p4_game for select
  to authenticated
  using (true);

drop policy if exists "Puissance 4 — jouer" on public.p4_game;
create policy "Puissance 4 — jouer"
  on public.p4_game for update
  to authenticated
  using (true)
  with check (true);
