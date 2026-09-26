-- Humeurs de l'accueil (Stressée, Fatiguée…) associées à chaque cours.
-- Clés stables, dans l'ordre de server/src/lib/moods.ts.
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS moods text[] NOT NULL DEFAULT '{}';

-- Recherche « tous les cours de cette humeur » : moods @> ARRAY['stressee'].
CREATE INDEX IF NOT EXISTS idx_videos_moods ON public.videos USING gin (moods);
