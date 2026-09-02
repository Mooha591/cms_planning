-- KyzenDay — ajoute la devise d'origine de chaque transaction de budget
-- (nécessaire pour une vraie conversion, pas juste un changement d'étiquette)
-- À exécuter dans Supabase : SQL Editor → New snippet → coller → Run

alter table public.budget_transactions
  add column if not exists currency text not null default 'EUR';
