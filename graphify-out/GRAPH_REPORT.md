# Graph Report - AppYogella  (2026-10-04)

## Corpus Check
- 96 files · ~71,964 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 15 file(s) not represented in the graph (top: (none) 8, .css 3, .example 1)

## Summary
- 668 nodes · 1564 edges · 32 communities (28 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.85)
- Token cost: 792,513 input · 0 output

## Community Hubs (Navigation)
- Pages et navigation front
- Runtime du prototype Design
- Auth, toasts et API front
- Panneau d'administration (front)
- Docs, déploiement et prototype
- Dépendances web (Vite)
- Sessions Supabase Auth
- API admin et utilitaires
- Config TypeScript web (app)
- Maquettes de l'app mobile
- Dépendances serveur (package)
- Démarrage serveur et uploads
- Abonnement Stripe et données utilisatrice
- Dépendances serveur (runtime)
- Config TypeScript web (node)
- Config TypeScript serveur
- Catalogue et sérialisation cours
- Lecteur YouTube
- Scripts npm serveur
- Sprite d'icônes Vite (inutilisé)
- Script create-admin
- Profil connecté et accès
- Config oxlint
- Photo de cours collectif
- Icône PWA maskable
- Entrypoint Docker
- Icône Apple touch
- Icône PWA 192px
- Icône PWA 512px
- Références TypeScript web
- Favicon Vite par défaut

## God Nodes (most connected - your core abstractions)
1. `Loader()` - 38 edges
2. `Svg()` - 29 edges
3. `App()` - 28 edges
4. `get()` - 23 edges
5. `createRuntime()` - 22 edges
6. `Lecteur()` - 22 edges
7. `react-router-dom` - 21 edges
8. `react` - 20 edges
9. `useToast()` - 19 edges
10. `useAuth()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `npm ci --include=dev build fix` --conceptually_related_to--> `web/README.md - React + TypeScript + Vite template`  [INFERRED]
  DEPLOY.md → web/README.md
- `web/index.html (PWA shell)` --implements--> `web/ - React + TypeScript + Vite mobile-first app (12 screens)`  [INFERRED]
  web/index.html → IMPLEMENTATION.md
- `web/README.md - React + TypeScript + Vite template` --conceptually_related_to--> `web/ - React + TypeScript + Vite mobile-first app (12 screens)`  [INFERRED]
  web/README.md → IMPLEMENTATION.md
- `UNIVERS (content universes list)` --conceptually_related_to--> `Prisma schema mapping onto pre-existing Supabase tables`  [INFERRED]
  project/Yogella.dc.html → IMPLEMENTATION.md
- `Stripe subscription billing` --implements--> `Subscription paywall (padlock on premium videos, 12 EUR/month, 99 EUR/year)`  [INFERRED]
  IMPLEMENTATION.md → chats/chat1.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Production runtime stack (Docker image, Coolify, Supabase, uploads volume)** — deploy_single_docker_image, deploy_coolify, deploy_supabase, deploy_uploads_volume, docker_compose_app [EXTRACTED 1.00]
- **Premium content paywall flow** — chats_chat1_paywall_requirement, project_yogella_dc_open, project_yogella_dc_deco, implementation_stripe_billing [INFERRED 0.85]
- **Design handoff to implementation lineage** — readme_handoff_bundle, chats_chat1, project_yogella_dc, implementation_web_app, implementation_tokens_css [EXTRACTED 1.00]
- **Content discovery flow (need selector / explore / search -> category -> player)** — project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_mood_need_selector, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_explorer_screen, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_search_screen, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_category_screen, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_player_screen [INFERRED 0.85]
- **Engagement & retention features** — project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_continue_watching, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_program_concept, project_uploads_ce0beac0_1c1f_410a_8c14_210685a90b38_weekly_goal_tracking [INFERRED 0.75]
- **Social/community brand icons (Bluesky, Discord, GitHub, X)** — web_public_icons_bluesky_icon, web_public_icons_discord_icon, web_public_icons_github_icon, web_public_icons_x_icon [INFERRED 0.85]

## Communities (32 total, 4 thin omitted)

### Community 0 - "Pages et navigation front"
Cohesion: 0.09
Nodes (68): react-router-dom, App(), Course Photo (group yoga class in child's pose), Child's Pose (Balasana), Group Yoga Class, Bright Minimal Yoga Studio Setting, CourseRow(), RequireAdmin() (+60 more)

### Community 1 - "Runtime du prototype Design"
Cohesion: 0.06
Nodes (75): boot(), bundledBlob(), cdnScriptFor(), collectProps(), compileAttr(), compileTemplate(), contentKey(), createComponentFactory() (+67 more)

### Community 2 - "Auth, toasts et API front"
Cohesion: 0.06
Nodes (47): react, react-dom, @tanstack/react-query, Auth Background (Desktop) - Seaside Sunset Meditation, Meditation / Wellness Brand Imagery, Auth Background (Mobile) Image, Seaside Sunset Meditation Imagery, AuthScreen() (+39 more)

### Community 3 - "Panneau d'administration (front)"
Cohesion: 0.08
Nodes (42): EditSheet(), ImagePicker(), IconCircleCheck(), IconCirclePause(), IconPencil(), IconTrash(), IconUpload(), AdminCourse (+34 more)

### Community 4 - "Docs, déploiement et prototype"
Cohesion: 0.06
Nodes (43): chat1.md - Yoga et Meditation App design transcript, Admin tab requirement (courses, programs, link videos, users, subscriptions), Pastel palette request (sage, terracotta, latte, sand, mocha), Subscription paywall (padlock on premium videos, 12 EUR/month, 99 EUR/year), DEPLOY.md - Coolify + Supabase deployment guide, Coolify (Traefik) deployment, npm run create-admin script, DATABASE_URL (pgBouncer 6543) / DIRECT_URL (session pooler 5432) (+35 more)

### Community 5 - "Dépendances web (Vite)"
Cohesion: 0.07
Nodes (29): oxlint, @types/react, @types/react-dom, vite, @vitejs/plugin-react, dependencies, react, react-dom (+21 more)

### Community 6 - "Sessions Supabase Auth"
Cohesion: 0.13
Nodes (24): express, clearSessionCookies(), options, sessionCookies, setSessionCookies(), adminCreateUser(), adminUpdateUserEmail(), AuthApiError (+16 more)

### Community 7 - "API admin et utilitaires"
Cohesion: 0.11
Nodes (16): MOOD_KEYS, MoodKey, slugify(), uniqueSlug(), uploadImage, uploadVideo, parseYoutubeId(), adminRouter (+8 more)

### Community 8 - "Config TypeScript web (app)"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "Maquettes de l'app mobile"
Cohesion: 0.19
Nodes (18): Educational Content Detail - Pourquoi ai-je mal au dos ?, Bottom Tab Bar (Accueil, Recherche, Ma pratique, Favoris, Profil), Category Screen - Auto-massages, Content Universes (Yoga, Bains sonores, Respiration, Auto-massages, Comprendre son corps, Sante de la femme, Nutrition, Sommeil, Mental & emotions, Podcasts), Resume Session Card (Reprends la ou tu t'etais arretee), Expert / Instructor, Experts Screen - Nos experts, Explorer Screen - Nos univers (+10 more)

### Community 10 - "Dépendances serveur (package)"
Cohesion: 0.11
Nodes (18): cookie-parser, jose, prisma, tsx, @types/cookie-parser, @types/cors, @types/express, @types/multer (+10 more)

### Community 11 - "Démarrage serveur et uploads"
Cohesion: 0.12
Nodes (14): cors, multer, allowedOrigins, app, here, indexHtml, server, webDistDir (+6 more)

### Community 12 - "Abonnement Stripe et données utilisatrice"
Cohesion: 0.14
Nodes (12): stripe, zod, prisma, requireAuth(), checkoutSchema, getStripe(), manualCustomerId(), stripeWebhookHandler() (+4 more)

### Community 13 - "Dépendances serveur (runtime)"
Cohesion: 0.11
Nodes (18): dependencies, cookie-parser, cors, dotenv, express, jose, multer, prisma (+10 more)

### Community 14 - "Config TypeScript web (node)"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 15 - "Config TypeScript serveur"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, outDir (+7 more)

### Community 16 - "Catalogue et sérialisation cours"
Cohesion: 0.29
Nodes (10): CourseWithUniverse, durationMin(), publishedWhere(), serializeCourse(), withUniverse, youtubeEmbedUrl(), youtubeThumbnail(), catalogRouter (+2 more)

### Community 17 - "Lecteur YouTube"
Cohesion: 0.29
Nodes (4): loadApi(), useYouTubePlayer(), Window, YTPlayer

### Community 18 - "Scripts npm serveur"
Cohesion: 0.25
Nodes (8): scripts, build, create-admin, dev, migrate, prisma:generate, start, test

### Community 19 - "Sprite d'icônes Vite (inutilisé)"
Cohesion: 0.25
Nodes (7): icons.svg SVG Symbol Sprite, bluesky-icon, discord-icon, documentation-icon, github-icon, social-icon, x-icon

### Community 20 - "Script create-admin"
Cohesion: 0.38
Nodes (6): dotenv, @prisma/client, arg(), flag(), main(), prisma

### Community 21 - "Profil connecté et accès"
Cohesion: 0.48
Nodes (6): ProfileWithSub, serializeMe(), subscriptionState(), attachUser(), displayName(), isSubscriptionActive()

### Community 22 - "Config oxlint"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 23 - "Photo de cours collectif"
Cohesion: 0.67
Nodes (3): Child's Pose (Balasana, extended arms), Group Yoga Class Session, Group Yoga Class Photo (Child's Pose)

### Community 24 - "Icône PWA maskable"
Cohesion: 0.50
Nodes (3): Earth-tone Palette (saddle brown #8B4A1C, cream #F5EBDC), Maskable App Icon 512px (concentric ring mark on brown), Yogella Brand Mark (cream ring with center dot, focus/meditation symbol)

### Community 26 - "Icône Apple touch"
Cohesion: 1.00
Nodes (3): Apple Touch Icon (Yogella app icon), Concentric Circle Brand Mark (cream ring and dot on brown), Earthy Brand Palette (saddle brown + cream)

### Community 27 - "Icône PWA 192px"
Cohesion: 1.00
Nodes (3): Concentric Circle Brand Mark (cream ring and dot on warm brown), Earthy Brand Palette (brown #8B4513-like, cream), PWA App Icon 192px (Yogella concentric circle logo)

### Community 28 - "Icône PWA 512px"
Cohesion: 1.00
Nodes (3): App Icon 512px (PWA), Concentric Circle Logo Mark (Ring + Dot), Earthy Brown and Cream Brand Palette

## Ambiguous Edges - Review These
- `Explorer Screen - Nos univers` → `Bottom Tab Bar (Accueil, Recherche, Ma pratique, Favoris, Profil)`  [AMBIGUOUS]
  project/uploads/ce0beac0-1c1f-410a-8c14-210685a90b38.JPG · relation: references
- `Auth Background (Desktop) - Seaside Sunset Meditation` → `Auth Background (Mobile) Image`  [AMBIGUOUS]
  web/src/assets/auth-bg-desktop.webp · relation: conceptually_related_to

## Knowledge Gaps
- **194 isolated node(s):** `name`, `version`, `description`, `main`, `test` (+189 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 240 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Explorer Screen - Nos univers` and `Bottom Tab Bar (Accueil, Recherche, Ma pratique, Favoris, Profil)`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **Why does `react` connect `Auth, toasts et API front` to `Pages et navigation front`, `Lecteur YouTube`, `Panneau d'administration (front)`, `Dépendances web (Vite)`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `createRuntime()` (e.g. with `adoptParsed()` and `dcUpdate()`) actually correct?**
  _`createRuntime()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _194 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Pages et navigation front` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **What is the exact relationship between `Auth Background (Desktop) - Seaside Sunset Meditation` and `Auth Background (Mobile) Image`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react-router-dom` connect `Pages et navigation front` to `Auth, toasts et API front`, `Dépendances web (Vite)`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._