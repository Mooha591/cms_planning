# KyzenDay

Carnet de tournée et de budget pour le terrain : saisis tes journées de travail
(horaires, pauses, secteur, employeur, kilomètres), suis ton budget et ton
planning, et obtiens automatiquement l'estimation de salaire et des frais
kilométriques. Application web installable (PWA), avec authentification et
synchronisation via Supabase.

## Fonctionnalités

- **Journées** — saisie des horaires (double plage + pause), type de journée,
  CMS / secteur / poste / employeur, calcul automatique des heures.
- **Salaire & km** — estimation du salaire (taux horaire + charges) et des frais
  kilométriques par employeur.
- **Budget** — transactions multi-devises avec répartition et tendances.
- **Planning** — organisation des journées à venir.
- **Historique** — calendrier mensuel, heatmap annuelle, synthèses et insights.
- **Sauvegarde** — export / import des données (JSON), export PDF et CSV du relevé.
- **Chill** — mini-jeux (onglet détente).
- **PWA** — installable, thème clair/sombre, taille de texte réglable.

## Stack

React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 · Supabase (Auth + Postgres)
· Vitest · oxlint. Déploiement : Vercel.

## Démarrage local

Pré-requis : **Node 22.x**.

```bash
npm install
cp .env.example .env   # puis renseigne tes clés Supabase
npm run dev
```

Variables d'environnement (voir `.env.example`) :

| Nom | Description |
|---|---|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clé *anon / publishable* |

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement (HMR) |
| `npm run build` | Build de production → `dist/` |
| `npm run preview` | Prévisualise le build |
| `npm run lint` | Lint (oxlint) |
| `npm test` | Tests unitaires (Vitest) |

## Base de données (Supabase)

Dans **Supabase → SQL Editor**, exécute les scripts `supabase/` **dans cet
ordre** :

1. `schema.sql` — table des journées
2. `budget_schema.sql` — budget
3. `budget_currency_migration.sql` — devise des transactions
4. `note_migration.sql` — champ note
5. `planning_schema.sql` — planning
6. `agency_logos_schema.sql` — logos des agences
7. `user_settings_schema.sql` — réglages par utilisateur
8. `p4_schema.sql` — Puissance 4 en ligne (optionnel, onglet Chill)
9. `updated_at_triggers.sql` — triggers de mise à jour de `updated_at`

`blackjack_cleanup.sql` est un script ponctuel de nettoyage (à n'exécuter que
si besoin).

## Déploiement

Voir [DEPLOY.md](DEPLOY.md) (Vercel + configuration Supabase).

## Licence

[MIT](LICENSE).
