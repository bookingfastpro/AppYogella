-- Notifications ciblées : les annonces vont à tout le monde, les alertes de
-- réservation aux seules administratrices. Uniquement des ajouts.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS kind     text NOT NULL DEFAULT 'announcement',
  ADD COLUMN IF NOT EXISTS link     text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_audience_check') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_audience_check CHECK (audience IN ('all', 'admins'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_audience ON public.notifications (audience, created_at DESC);
