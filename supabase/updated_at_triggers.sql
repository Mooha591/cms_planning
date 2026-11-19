-- KyzenDay — met à jour automatiquement la colonne `updated_at` à chaque
-- modification d'une ligne. Sans ce trigger, `updated_at` garde la valeur
-- posée à la création (default now()) et ne reflète jamais les éditions.
-- À exécuter APRÈS les schémas des tables. Idempotent : réexécutable sans
-- risque.

-- Fonction partagée : pose `updated_at` à l'instant courant avant chaque UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Un trigger par table possédant une colonne `updated_at`.
-- (p4_game volontairement exclu : partie de jeu, horodatage non critique.)
drop trigger if exists set_updated_at on public.entries;
create trigger set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.budget_transactions;
create trigger set_updated_at
  before update on public.budget_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.planning;
create trigger set_updated_at
  before update on public.planning
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.agency_logos;
create trigger set_updated_at
  before update on public.agency_logos
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_settings;
create trigger set_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();
