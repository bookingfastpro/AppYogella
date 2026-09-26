# Déploiement — Coolify + Supabase

L'application est packagée en **une seule image Docker** : le process Express
sert l'API (`/api/*`), les vidéos uploadées (`/uploads/*`) **et** le build du
front React. Un seul service, un seul domaine, donc pas de CORS et des cookies
de session same-site.

```
navigateur ──► Traefik (Coolify) ──► conteneur :3000 ──► Supabase (Postgres)
                                          │
                                          └── volume /app/uploads
```

---

## 1. En local

L'application utilise toujours le projet Supabase (base **et** Supabase Auth),
y compris en local : il n'y a plus de Postgres local ni de données de démo.
Renseigner d'abord `server/.env` à partir de `server/.env.example`.

### Option A — Docker Compose (même image que la production)

```bash
docker compose up --build     # http://localhost:3000
```

### Option B — Node en direct (itération rapide sur le front)

```bash
cd server && npm install && npm run migrate && npm run dev   # :4000
cd web && npm install && npm run dev                          # :5173 (proxy → :4000)
```

### Comptes administrateurs

Les comptes sont créés par l'inscription dans l'application (Supabase Auth).
Pour promouvoir un compte existant :

```bash
cd server && npm run create-admin -- --email=x@y.fr
```

---

## 2. Brancher Supabase (cloud)

Dans le dashboard Supabase : **Project Settings → Database → Connection string**.

Deux URLs sont nécessaires, parce que Prisma migre via une connexion directe et
tourne via le pooler :

| Variable       | Port   | Usage                                     |
| -------------- | ------ | ----------------------------------------- |
| `DATABASE_URL` | `6543` | runtime — transaction pooler (pgBouncer)   |
| `DIRECT_URL`   | `5432` | `prisma migrate deploy` — session pooler   |

```
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-1-<region>.pooler.supabase.com:5432/postgres"
```

`?pgbouncer=true` n'est pas optionnel : sans lui, Prisma prépare des requêtes
que pgBouncer ne sait pas réutiliser en mode transaction.

N'ajoutez **pas** `connection_limit=1`. C'est la recette pour du serverless, où
chaque invocation ouvre son propre client ; ici le conteneur est un process
long, et plafonner le pool à une connexion sérialiserait toutes les requêtes.

> **IPv6 — à vérifier avant le premier déploiement.** L'hôte de connexion
> directe `db.<ref>.supabase.co` n'a **pas d'enregistrement A** : il n'est
> joignable qu'en IPv6. Si votre serveur Coolify n'a pas d'IPv6 sortant,
> `prisma migrate deploy` échouera au démarrage du conteneur.
>
> ```
> $ host -t A db.<ref>.supabase.co
> db.<ref>.supabase.co has no A record
> ```
>
> Deux solutions : pointer `DIRECT_URL` sur le **session pooler**
> (`aws-0-<region>.pooler.supabase.com:5432`, qui répond en IPv4) plutôt que sur
> `db.<ref>.supabase.co`, ou activer l'add-on IPv4 de Supabase (payant). La
> première est gratuite et suffit — c'est celle retenue par défaut ici.

Le schéma est géré **par les migrations Prisma** (`server/prisma/migrations/`),
pas depuis l'éditeur SQL de Supabase — l'entrypoint du conteneur applique
`prisma migrate deploy` à chaque déploiement.

> L'API accède aux tables via le rôle `postgres`, qui ignore la Row Level
> Security : l'autorisation est faite par l'API (session Supabase Auth +
> `profiles.is_admin`). Les policies RLS héritées de la première application
> restent en place et protègent l'accès direct via PostgREST ; les tables
> ajoutées par Yogella (`plans`, `app_settings`, `experts`) ont la RLS activée
> sans policy, donc fermées aux clés publiques.

---

## 3. Déployer sur Coolify

1. **New Resource → Application → Public/Private Repository**, pointer sur ce dépôt.
2. **Build Pack : `Dockerfile`** (à la racine). Ne pas choisir Nixpacks.
3. **Ports Exposes : `3000`**.
4. **Health check path : `/api/health`** (déjà déclaré en `HEALTHCHECK` dans l'image).
5. **Persistent Storage** — indispensable, sinon les vidéos uploadées
   disparaissent à chaque déploiement :
   - Type : *Volume*
   - Destination Path : `/app/uploads`
6. **Environment Variables** :

   | Variable | Valeur |
   | --- | --- |
   | `DATABASE_URL` | URL poolée Supabase (port 6543) |
   | `DIRECT_URL` | URL du pooler de sessions Supabase (port 5432) |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_PUBLISHABLE_KEY` | clé `sb_publishable_…` |
   | `SUPABASE_SECRET_KEY` | clé `sb_secret_…` (ne jamais l'exposer au navigateur) |
   | `WEB_ORIGIN` | `https://votre-domaine.fr` |
   | `NODE_ENV` | `production` |
   | `STRIPE_SECRET_KEY` | facultatif |
   | `STRIPE_WEBHOOK_SECRET` | facultatif |

   Les identifiants de prix Stripe se règlent dans la table `plans`
   (`stripe_price_id`) ; sans eux, le prix affiché est facturé tel quel.

7. Renseigner le domaine dans **Domains**, puis **Deploy**.

`WEB_ORIGIN` doit être le domaine public : il sert d'origine CORS autorisée et
d'URL de retour pour le checkout Stripe. Il accepte une liste séparée par des
virgules si plusieurs domaines pointent sur l'application.

### Ce que fait l'entrypoint à chaque démarrage

1. Vérifie `DATABASE_URL` (et retombe sur elle si `DIRECT_URL` est absente).
2. `prisma migrate deploy` — les migrations ne font que des ajouts au schéma
   Supabase. Il n'y a pas de seed : le contenu vit dans Supabase.

### Webhook Stripe

Si vous activez la facturation, pointer le webhook Stripe sur
`https://votre-domaine.fr/api/webhooks/stripe` et reporter le signing secret
dans `STRIPE_WEBHOOK_SECRET`.

---

## 4. Points d'attention

- **Uploads et scaling horizontal.** Les vidéos sont écrites sur le disque local
  (`server/src/lib/upload.ts`). Le volume Coolify suffit pour une instance ; à
  plusieurs replicas il faudra basculer sur Supabase Storage ou S3 — ce fichier
  est le seul point à modifier.
- **Cookies.** Le cookie de session est `httpOnly`, `sameSite=lax` et `secure`
  dès que `NODE_ENV=production`. L'application fait confiance aux en-têtes
  `X-Forwarded-*` de Traefik (`app.set("trust proxy", 1)`), sans quoi le cookie
  ne serait jamais posé derrière HTTPS.
- **Migrations.** Toute évolution du schéma se fait via
  `npx prisma migrate dev --name <nom>` en local, puis commit du dossier généré.

---

## 5. Dépannage

### `sh: 1: tsc: not found` pendant le build

Coolify injecte les variables d'environnement de l'application comme `ARG`/`ENV`
dans le Dockerfile. `NODE_ENV=production` est donc actif **pendant le build**, et
dans ce mode `npm ci` ignore les `devDependencies` — or `typescript`, `vite` et
`@vitejs/plugin-react` en font partie.

C'est pourquoi les deux étapes de build utilisent `npm ci --include=dev`. Ne
retirez pas ce drapeau : le symptôme est un build qui installe 9 paquets au lieu
de 34, puis échoue en `exit code 127`.

### `DATABASE_URL n'est pas défini` au démarrage du conteneur

La variable existe au build mais pas à l'exécution. Dans Coolify, décochez
**« Build Variable »** sur `DATABASE_URL` et `DIRECT_URL` : cochée, la variable
n'est qu'un `ARG` de build et disparaît du conteneur.

Les variables modifiées ne sont pas injectées dans un conteneur déjà lancé — il
faut **redéployer**.

### Avertissements `SecretsUsedInArgOrEnv`

Ils signalent que des secrets (`JWT_SECRET`, `DATABASE_URL`) transitent par des
`ARG` de build et se retrouvent donc dans les métadonnées de l'image. Non
bloquant, mais c'est une raison de plus de laisser « Build Variable » décochée :
l'application n'a besoin de ces valeurs qu'à l'exécution.
