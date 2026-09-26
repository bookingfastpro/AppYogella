-- Yogella sur le schéma Supabase existant.
--
-- Les tables (profiles, categories, videos, programs, …) et les comptes
-- (auth.users) existent déjà. Cette migration ne fait que des ajouts : colonnes
-- avec valeur par défaut et nouvelles tables. Rien n'est renommé ni supprimé.

-- ─── Comptes ────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active   boolean NOT NULL DEFAULT true;

-- ─── Univers : couleurs de tuile et écran ouvert depuis Explorer ────────────
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS bg   text NOT NULL DEFAULT 'var(--color-neutral-200)',
  ADD COLUMN IF NOT EXISTS fg   text NOT NULL DEFAULT 'var(--color-neutral-900)',
  ADD COLUMN IF NOT EXISTS dest text NOT NULL DEFAULT 'categorie';

UPDATE public.categories AS c
SET bg = v.bg, fg = v.fg, dest = v.dest
FROM (VALUES
  ('yoga',                 'var(--color-accent-2-300)', 'var(--color-accent-2-900)', 'categorie'),
  ('bains-sonores',        'var(--color-accent-300)',   'var(--color-accent-900)',   'categorie'),
  ('breathing',            'var(--color-neutral-300)',  'var(--color-neutral-900)',  'categorie'),
  ('auto-massages',        'var(--color-accent-200)',   'var(--color-accent-900)',   'categorie'),
  ('comprendre-son-corps', 'var(--color-accent-2-200)', 'var(--color-accent-2-900)', 'article'),
  ('sante-de-la-femme',    'var(--color-accent-300)',   'var(--color-accent-900)',   'programme'),
  ('nutrition',            'var(--color-accent-2-400)', 'var(--color-accent-2-900)', 'categorie'),
  ('sleep',                'var(--color-neutral-700)',  '#f9f4ed',                   'categorie'),
  ('mental-et-emotions',   'var(--color-neutral-200)',  'var(--color-neutral-900)',  'categorie'),
  ('podcasts',             'var(--color-accent-100)',   'var(--color-accent-900)',   'categorie')
) AS v(slug, bg, fg, dest)
WHERE c.slug = v.slug;

-- ─── Cours : articles, vidéos hébergées, vignette, sous-catégorie ───────────
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS kind            text NOT NULL DEFAULT 'COURSE',
  ADD COLUMN IF NOT EXISTS video_url       text,
  ADD COLUMN IF NOT EXISTS thumbnail_url   text,
  ADD COLUMN IF NOT EXISTS subcategory     text,
  ADD COLUMN IF NOT EXISTS instructor_role text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'videos_kind_check') THEN
    ALTER TABLE public.videos
      ADD CONSTRAINT videos_kind_check CHECK (kind IN ('COURSE', 'ARTICLE'));
  END IF;
END $$;

-- Un article ou une vidéo hébergée n'a pas d'identifiant YouTube. Le contrôle
-- de format existant (videos_youtube_id_format) reste valable pour les autres.
ALTER TABLE public.videos ALTER COLUMN youtube_id DROP NOT NULL;

-- ─── Programmes : les routines de « Ma pratique » ───────────────────────────
ALTER TABLE public.programs
  ADD COLUMN IF NOT EXISTS is_routine boolean NOT NULL DEFAULT false;

-- ─── Abonnements : formule choisie et fin d'essai ───────────────────────────
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan      text,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_plan_check') THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_plan_check CHECK (plan IS NULL OR plan IN ('MONTHLY', 'ANNUAL'));
  END IF;
END $$;

-- ─── Formules mensuelle et annuelle ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plans (
  key             text PRIMARY KEY CHECK (key IN ('MONTHLY', 'ANNUAL')),
  label           text NOT NULL,
  price_cents     integer NOT NULL CHECK (price_cents > 0),
  active          boolean NOT NULL DEFAULT true,
  stripe_price_id text
);

INSERT INTO public.plans (key, label, price_cents) VALUES
  ('MONTHLY', 'Mensuel', 1200),
  ('ANNUAL',  'Annuel',  9900)
ON CONFLICT (key) DO NOTHING;

-- ─── Réglages (durée de l'essai gratuit) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_settings (
  id         text PRIMARY KEY DEFAULT 'singleton' CHECK (id = 'singleton'),
  trial_days integer NOT NULL DEFAULT 0 CHECK (trial_days BETWEEN 0 AND 60)
);

INSERT INTO public.app_settings (id, trial_days) VALUES ('singleton', 7)
ON CONFLICT (id) DO NOTHING;

-- ─── Experts ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.experts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  role       text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

INSERT INTO public.experts (name, role, sort_order)
SELECT * FROM (VALUES
  ('Estelle',  'Yoga, Méditation, Respiration, Bains sonores', 1),
  ('Virginie', 'Naturopathie, Nutrition',                      2),
  ('Camille',  'Ostéopathie',                                  3),
  ('Julie',    'Sage-femme',                                   4)
) AS v(name, role, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.experts);

-- L'API passe par le rôle postgres, qui ignore la RLS. L'activer sans policy
-- ferme ces tables aux clés publiques (PostgREST), comme le reste du schéma.
ALTER TABLE public.plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experts      ENABLE ROW LEVEL SECURITY;
