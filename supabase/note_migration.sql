-- KyzenDay — ajoute un champ note libre à chaque journée (pour la
-- fonctionnalité "Transformer ma note")
-- À exécuter dans Supabase : SQL Editor → New snippet → coller → Run

alter table public.entries
  add column if not exists note text;
