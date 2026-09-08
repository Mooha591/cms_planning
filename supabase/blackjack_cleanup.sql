-- KyzenDay — nettoyage : supprime les tables du Blackjack (fonctionnalité
-- abandonnée). Sans effet si elles n'ont jamais été créées.

drop table if exists public.blackjack_players;
drop table if exists public.blackjack_decks;
drop table if exists public.blackjack_tables;
