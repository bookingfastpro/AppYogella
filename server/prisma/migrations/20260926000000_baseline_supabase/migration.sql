-- Référence : schéma public tel que créé par la première application sur ce
-- projet Supabase (dump pg_dump --schema-only du 2026-09-27).
--
-- Marquée comme appliquée sur la base existante (prisma migrate resolve) ;
-- elle ne sert qu'à reconstruire un projet Supabase vierge. Les tables
-- référencent auth.users, fourni par Supabase Auth.

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: get_top_favorited_videos(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_favorited_videos(video_limit integer DEFAULT 10) RETURNS TABLE(video_id uuid, favorite_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select video_id, count(*) as favorite_count
  from public.favorites
  group by video_id
  order by favorite_count desc, video_id
  limit video_limit;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    image_path text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: membership_plan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.membership_plan (
    id integer DEFAULT 1 NOT NULL,
    stripe_product_id text,
    stripe_price_id text,
    title text DEFAULT 'Abonnement Yogella'::text NOT NULL,
    description text DEFAULT 'Accès illimité à toutes les séances premium.'::text NOT NULL,
    features text[] DEFAULT '{}'::text[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT membership_plan_single_row CHECK ((id = 1))
);


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.profiles IS 'One row per auth.users row. Created automatically by handle_new_user() on signup.';


--
-- Name: program_videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_videos (
    program_id uuid NOT NULL,
    video_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL
);


--
-- Name: programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.programs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    subtitle text,
    description text,
    image_path text,
    level text,
    sort_order integer DEFAULT 0 NOT NULL,
    published boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stripe_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stripe_events (
    id text NOT NULL,
    type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_customer_id text NOT NULL,
    stripe_subscription_id text,
    status text DEFAULT 'incomplete'::text NOT NULL,
    price_id text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_manual boolean DEFAULT false NOT NULL
);


--
-- Name: videos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    category_id uuid NOT NULL,
    is_premium boolean DEFAULT false NOT NULL,
    duration_seconds integer NOT NULL,
    level text,
    instructor text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    youtube_id text NOT NULL,
    CONSTRAINT videos_duration_seconds_check CHECK ((duration_seconds > 0)),
    CONSTRAINT videos_level_check CHECK ((level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))),
    CONSTRAINT videos_youtube_id_format CHECK ((youtube_id ~ '^[A-Za-z0-9_-]{11}$'::text))
);


--
-- Name: COLUMN videos.youtube_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.videos.youtube_id IS 'The 11-character YouTube video ID. Thumbnails are derived from this and are public for every video (including premium) per product spec, so this column is no longer column-grant-restricted like video_path was — the real gate is application-level: the (app) video detail page only renders the embedded player for authorized users.';


--
-- Name: watch_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_history (
    user_id uuid NOT NULL,
    video_id uuid NOT NULL,
    progress_seconds integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_video_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_video_id_key UNIQUE (user_id, video_id);


--
-- Name: membership_plan membership_plan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.membership_plan
    ADD CONSTRAINT membership_plan_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (notification_id, user_id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: program_videos program_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_videos
    ADD CONSTRAINT program_videos_pkey PRIMARY KEY (program_id, video_id);


--
-- Name: programs programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_pkey PRIMARY KEY (id);


--
-- Name: programs programs_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.programs
    ADD CONSTRAINT programs_slug_key UNIQUE (slug);


--
-- Name: stripe_events stripe_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stripe_events
    ADD CONSTRAINT stripe_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: subscriptions subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: videos videos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_pkey PRIMARY KEY (id);


--
-- Name: videos videos_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_slug_key UNIQUE (slug);


--
-- Name: watch_history watch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_pkey PRIMARY KEY (user_id, video_id);


--
-- Name: idx_categories_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_sort_order ON public.categories USING btree (sort_order);


--
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- Name: idx_favorites_video_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorites_video_id ON public.favorites USING btree (video_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_program_videos_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_program_videos_order ON public.program_videos USING btree (program_id, "position");


--
-- Name: idx_programs_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_programs_sort_order ON public.programs USING btree (sort_order);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_videos_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_category_id ON public.videos USING btree (category_id);


--
-- Name: idx_videos_is_premium; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_is_premium ON public.videos USING btree (is_premium);


--
-- Name: idx_videos_published_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_videos_published_at ON public.videos USING btree (published_at DESC) WHERE (published_at IS NOT NULL);


--
-- Name: idx_watch_history_user_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_watch_history_user_recent ON public.watch_history USING btree (user_id, updated_at DESC);


--
-- Name: profiles profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscriptions subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: videos videos_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER videos_set_updated_at BEFORE UPDATE ON public.videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: program_videos program_videos_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_videos
    ADD CONSTRAINT program_videos_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE;


--
-- Name: program_videos program_videos_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_videos
    ADD CONSTRAINT program_videos_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: videos videos_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.videos
    ADD CONSTRAINT videos_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: watch_history watch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: watch_history watch_history_video_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_video_id_fkey FOREIGN KEY (video_id) REFERENCES public.videos(id) ON DELETE CASCADE;


--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories categories_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY categories_select_all ON public.categories FOR SELECT USING (true);


--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites favorites_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_delete_own ON public.favorites FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: favorites favorites_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_insert_own ON public.favorites FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorites favorites_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY favorites_select_own ON public.favorites FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: membership_plan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.membership_plan ENABLE ROW LEVEL SECURITY;

--
-- Name: membership_plan membership_plan_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY membership_plan_select_all ON public.membership_plan FOR SELECT USING (true);


--
-- Name: notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_reads notification_reads_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_reads_insert_own ON public.notification_reads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notification_reads notification_reads_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notification_reads_select_own ON public.notification_reads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_all ON public.notifications FOR SELECT USING (true);


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: program_videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.program_videos ENABLE ROW LEVEL SECURITY;

--
-- Name: program_videos program_videos_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY program_videos_select_all ON public.program_videos FOR SELECT USING (true);


--
-- Name: programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

--
-- Name: programs programs_select_published; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY programs_select_published ON public.programs FOR SELECT USING ((published = true));


--
-- Name: stripe_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: videos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

--
-- Name: videos videos_select_published; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY videos_select_published ON public.videos FOR SELECT USING (((published_at IS NOT NULL) AND (published_at <= now())));


--
-- Name: watch_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_history watch_history_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY watch_history_insert_own ON public.watch_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: watch_history watch_history_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY watch_history_select_own ON public.watch_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: watch_history watch_history_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY watch_history_update_own ON public.watch_history FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- PostgreSQL database dump complete
--


