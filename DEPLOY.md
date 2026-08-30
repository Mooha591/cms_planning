# Déploiement sur Vercel

App **Vite + React** (SPA, routing côté client via react-router). Sortie de build : `dist/`.

## 1. Pré-requis Supabase (une fois)

Dans **Supabase → SQL Editor**, exécute les schémas s'ils ne le sont pas déjà :

- `supabase/schema.sql` (journées)
- `supabase/budget_schema.sql` (budget)
- `supabase/p4_schema.sql` (Puissance 4 en ligne)

## 2. Mettre le projet sous Git

Le dossier du projet est `carnet-tournee/` (celui qui contient `package.json`).

```bash
cd carnet-tournee
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<toi>/<repo>.git
git push -u origin main
```

`.env` et `dist/` sont déjà dans `.gitignore` → aucun secret n'est poussé.

## 3. Importer dans Vercel

1. [vercel.com/new](https://vercel.com/new) → **Import** le repo GitHub.
2. Vercel détecte **Vite** automatiquement :
   - Build Command : `npm run build`
   - Output Directory : `dist`
   - Install Command : `npm install`
3. Si le repo GitHub a le projet dans un sous-dossier, règle **Root Directory** = `carnet-tournee`.

## 4. Variables d'environnement (Vercel → Settings → Environment Variables)

| Nom | Valeur | Envs |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | la clé *anon / publishable* | Production, Preview, Development |

Ces variables sont lues **au build** (préfixe `VITE_`). Après les avoir ajoutées, relance un déploiement (**Deployments → … → Redeploy**).

## 5. Configurer les URL d'auth Supabase

**Supabase → Authentication → URL Configuration** :

- **Site URL** : `https://<ton-projet>.vercel.app`
- **Redirect URLs** : ajoute
  - `https://<ton-projet>.vercel.app/**`
  - `https://*.vercel.app/**` (facultatif, pour les preview deployments)

Sans ça, le lien de réinitialisation de mot de passe (`/reset-password`) et les emails de confirmation ne reviennent pas sur le bon domaine.

## 6. Fichier `vercel.json` (déjà dans le repo)

- **rewrites** : toutes les routes inconnues → `index.html` (nécessaire pour react-router ; sans ça, un rechargement sur `/budget` ou `/chill` renvoie 404). Les fichiers réels de `dist/` (`/assets/*`, `/sw.js`, `/manifest.webmanifest`…) restent servis normalement.
- **headers** : `/sw.js` en `max-age=0, must-revalidate` pour que le service worker se mette à jour à chaque déploiement.

## Alternative : Vercel CLI (sans GitHub)

```bash
cd carnet-tournee
npm i -g vercel
vercel            # premier déploiement (preview) + questions de config
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod     # déploiement en production
```

## Notes

- Node : Vercel utilise Node 22 par défaut, compatible avec Vite 8. Pour figer une version, ajoute `"engines": { "node": "22.x" }` dans `package.json`.
- `oxlint` n'est pas lancé au build ; le déploiement ne dépend pas du lint.
