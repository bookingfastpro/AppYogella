# Yogella — implementation

A production build-out of the `Yogella.dc.html` Claude Design prototype (see
`README.md`, `chats/`, `project/` for the original design handoff).

- `server/` — Express + TypeScript + Prisma API on an existing Supabase
  project: Supabase Auth sessions, catalog, favorites/progress, Stripe
  subscription billing, and an admin API (courses, programs, users, plans,
  video upload).
- `web/` — React + TypeScript + Vite mobile-first web app implementing all
  12 screens from the prototype (Accueil, Explorer, Catégorie, Programme,
  Recherche, Lecteur, Article, Ma pratique, Experts, Favoris, Profil,
  Administration) plus the paywall and new Login/Register screens (the
  prototype had no real auth, so these didn't exist there).

## Déploiement & exécution

Voir **[DEPLOY.md](DEPLOY.md)** pour le détail (Coolify, Supabase, variables
d'environnement, volume des uploads).

Renseigner d'abord `server/.env` (voir `server/.env.example`), puis :

```bash
docker compose up --build     # image de production, http://localhost:3000
```

En mode développement séparé (rechargement à chaud du front) :

```bash
cd server && npm install && npm run migrate && npm run dev   # :4000
cd web && npm install && npm run dev                          # :5173
```

Pour donner les droits d'administration à un compte déjà inscrit :

```bash
cd server && npm run create-admin -- --email=x@y.fr
```

## Base de données — Supabase

L'application tourne sur un schéma Supabase **préexistant** (tables `profiles`,
`categories`, `videos`, `programs`, `program_videos`, `favorites`,
`watch_history`, `subscriptions`). `server/prisma/schema.prisma` mappe les
modèles Yogella sur ces tables (`Universe` → `categories`, `Course` → `videos`,
`WatchProgress` → `watch_history`, …).

- **Comptes** : Supabase Auth (`auth.users`). Le serveur relaie connexion et
  inscription, garde les jetons dans des cookies httpOnly et vérifie les jetons
  d'accès localement via le JWKS (ES256). `profiles.is_admin` / `active` portent
  les droits.
- **Migrations** : SQL écrit à la main dans `server/prisma/migrations/`,
  appliqué par `prisma migrate deploy`. `…_baseline_supabase` décrit le schéma
  d'origine (marquée appliquée) ; les suivantes ne font que des ajouts.
  `prisma migrate dev` n'est pas utilisable (le schéma `auth` manque à la base
  fantôme).
- **Pas de seed** : le contenu se gère depuis l'admin.
- `DATABASE_URL` : pooler de transactions (6543, `?pgbouncer=true`) ;
  `DIRECT_URL` : pooler de sessions (5432), pour les migrations.

## Stripe billing

Subscription checkout/portal endpoints require `STRIPE_SECRET_KEY` (and
`STRIPE_WEBHOOK_SECRET` for the webhook) in `server/.env`. Without a key
configured, the checkout/portal endpoints return a clear 503 rather than
failing silently — pricing itself is still fully editable from the admin
panel. Plans fall back to Stripe's inline `price_data` if no
`STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL` price IDs are set.

## Video storage

Admin-uploaded course videos are stored on local disk under
`server/uploads/` and served at `/uploads/...`. `server/src/lib/upload.ts`
is the single place that would need to change to swap in S3 or another
object store for a multi-instance deployment.

## Notable design decisions vs. the prototype

- The prototype rendered a fake phone bezel/status bar for the clickable
  demo; the real app is a plain responsive mobile-first web app (no fake
  hardware chrome), matching the phone-width layout, colors, type and
  radii from the Organic design system (`project/_ds/…/styles.css`,
  ported into `web/src/styles/tokens.css`).
- The prototype only *simulated* state in memory (subscription status,
  admin CRUD, per-day activity). All of that is now real, persisted data:
  Postgres via Prisma, real auth sessions, real Stripe subscriptions, and
  watch-progress rows driving the "Ma pratique" stats.
- "Routines" (Ma pratique) and "Programmes" (Explorer/Home) share one
  `Program` model (`isRoutine` flag) since they're the same shape:
  a titled, ordered list of course sessions.
