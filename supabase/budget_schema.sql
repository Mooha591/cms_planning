-- KyzenDay — schéma de l'onglet Budget (revenus/dépenses) + RLS
-- À exécuter dans Supabase : SQL Editor → New snippet → coller → Run

create table if not exists public.budget_transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('revenu', 'depense')),
  categorie text,
  libelle text,
  montant numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_transactions_user_id_date_idx
  on public.budget_transactions (user_id, date desc);

-- Row Level Security : chacun ne voit / modifie que ses propres transactions
alter table public.budget_transactions enable row level security;

drop policy if exists "Peut voir ses propres transactions" on public.budget_transactions;
create policy "Peut voir ses propres transactions"
  on public.budget_transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Peut créer ses propres transactions" on public.budget_transactions;
create policy "Peut créer ses propres transactions"
  on public.budget_transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Peut modifier ses propres transactions" on public.budget_transactions;
create policy "Peut modifier ses propres transactions"
  on public.budget_transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Peut supprimer ses propres transactions" on public.budget_transactions;
create policy "Peut supprimer ses propres transactions"
  on public.budget_transactions for delete
  using (auth.uid() = user_id);
