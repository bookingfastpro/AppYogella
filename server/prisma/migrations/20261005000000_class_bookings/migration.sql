-- Réservation de cours physiques au studio.
-- Uniquement des ajouts : trois nouvelles tables.

CREATE TABLE IF NOT EXISTS public.class_series (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  description     text,
  instructor      text,
  location        text,
  level           text,
  capacity        integer NOT NULL CHECK (capacity > 0),
  duration_min    integer NOT NULL CHECK (duration_min > 0),
  weekdays        integer[] NOT NULL,          -- 0 = lundi … 6 = dimanche
  start_time      text NOT NULL CHECK (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  start_date      date NOT NULL,
  end_date        date,
  generated_until date,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id    uuid REFERENCES public.class_series(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  instructor   text,
  location     text,
  level        text,
  starts_at    timestamptz NOT NULL,
  duration_min integer NOT NULL CHECK (duration_min > 0),
  capacity     integer NOT NULL CHECK (capacity > 0),
  cancelled    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_class_sessions_starts_at ON public.class_sessions (starts_at);
-- Une série ne génère qu'une séance par horaire, même si la génération est relancée.
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_sessions_series_start
  ON public.class_sessions (series_id, starts_at) WHERE series_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.class_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'cancelled')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  UNIQUE (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_class_bookings_user ON public.class_bookings (user_id);

-- Fermées aux clés publiques (PostgREST) : seule l'API y accède.
ALTER TABLE public.class_series   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
