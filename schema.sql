-- =========================================================
-- FULL SCHEMA EXPORT (public schema)
-- =========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Functions ----------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.rename_filter_option(p_category text, p_old_label text, p_new_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_col text;
BEGIN
  IF p_old_label IS NULL OR p_new_label IS NULL OR p_old_label = p_new_label THEN
    RETURN;
  END IF;

  IF p_category IN ('intent','noise','equipment','lokaltyp') THEN
    v_col := p_category;
  ELSIF p_category = 'facility' THEN
    v_col := 'facilities';
  ELSE
    v_col := NULL;
  END IF;

  IF v_col IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET %1$I = array_replace(%1$I, $1, $2) WHERE $1 = ANY(%1$I)',
      v_col
    ) USING p_old_label, p_new_label;
  ELSE
    UPDATE public.spaces
    SET tags = jsonb_set(
      tags,
      ARRAY[p_category],
      to_jsonb(
        (SELECT array_agg(CASE WHEN x = p_old_label THEN p_new_label ELSE x END)
         FROM unnest(ARRAY(SELECT jsonb_array_elements_text(tags->p_category))) AS x)
      )
    )
    WHERE tags ? p_category
      AND tags->p_category @> to_jsonb(p_old_label);
  END IF;
END;
$function$;

-- ---------- Table: app_settings ----------
CREATE TABLE public.app_settings (
  key         text NOT NULL,
  value       text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "App settings viewable by everyone"
  ON public.app_settings FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert app settings"
  ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update app settings"
  ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete app settings"
  ON public.app_settings FOR DELETE TO authenticated USING (true);

-- ---------- Table: filter_categories ----------
CREATE TABLE public.filter_categories (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  key               text NOT NULL,
  title             text NOT NULL,
  style             text NOT NULL DEFAULT 'pills',
  match_mode        text NOT NULL DEFAULT 'all',
  is_single_select  boolean NOT NULL DEFAULT false,
  locked            boolean NOT NULL DEFAULT false,
  sort_order        integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  title_en          text,
  CONSTRAINT filter_categories_pkey PRIMARY KEY (id),
  CONSTRAINT filter_categories_key_key UNIQUE (key)
);

GRANT SELECT ON public.filter_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filter_categories TO authenticated;
GRANT ALL ON public.filter_categories TO service_role;

ALTER TABLE public.filter_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filter categories viewable by everyone"
  ON public.filter_categories FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert filter categories"
  ON public.filter_categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update filter categories"
  ON public.filter_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete filter categories"
  ON public.filter_categories FOR DELETE TO authenticated USING (true);

-- ---------- Table: filter_options ----------
CREATE TABLE public.filter_options (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  category      text NOT NULL,
  label         text NOT NULL,
  icon_url      text,
  default_icon  text,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  label_en      text,
  CONSTRAINT filter_options_pkey PRIMARY KEY (id),
  CONSTRAINT filter_options_category_label_key UNIQUE (category, label)
);

GRANT SELECT ON public.filter_options TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.filter_options TO authenticated;
GRANT ALL ON public.filter_options TO service_role;

ALTER TABLE public.filter_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Filter options viewable by everyone"
  ON public.filter_options FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert filter options"
  ON public.filter_options FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update filter options"
  ON public.filter_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete filter options"
  ON public.filter_options FOR DELETE TO authenticated USING (true);

-- ---------- Table: spaces ----------
CREATE TABLE public.spaces (
  id                       uuid NOT NULL DEFAULT gen_random_uuid(),
  name                     text NOT NULL,
  category                 text,
  description              text NOT NULL DEFAULT ''::text,
  intent                   text[] NOT NULL DEFAULT '{}'::text[],
  noise                    text[] NOT NULL DEFAULT '{}'::text[],
  equipment                text[] NOT NULL DEFAULT '{}'::text[],
  facilities               text[] NOT NULL DEFAULT '{}'::text[],
  image_url                text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  sort_order               integer NOT NULL DEFAULT 0,
  floor                    text,
  images                   text[] NOT NULL DEFAULT '{}'::text[],
  map_url                  text,
  booking_url              text,
  lokaltyp                 text[] NOT NULL DEFAULT '{}'::text[],
  tags                     jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_alts               text[] NOT NULL DEFAULT '{}'::text[],
  capacity                 integer,
  notice                   text,
  show_capacity_publicly   boolean NOT NULL DEFAULT false,
  computers_url            text,
  group_booking_url        text,
  located_in               text,
  name_en                  text,
  description_en           text,
  notice_en                text,
  located_in_en            text,
  floor_en                 text,
  group_booking_url_en     text,
  countmatters_sensor_id   text,
  show_occupancy           boolean NOT NULL DEFAULT true,
  booking_room_number      integer,
  CONSTRAINT spaces_pkey PRIMARY KEY (id)
);

CREATE INDEX spaces_sort_order_idx ON public.spaces USING btree (sort_order);

GRANT SELECT ON public.spaces TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spaces TO authenticated;
GRANT ALL ON public.spaces TO service_role;

ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Spaces are viewable by everyone"
  ON public.spaces FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert spaces"
  ON public.spaces FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update spaces"
  ON public.spaces FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete spaces"
  ON public.spaces FOR DELETE TO authenticated USING (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('space-images', 'space-images', true);

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS book_now_url text,
  ADD COLUMN IF NOT EXISTS book_now_url_en text;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS image_alts_en text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS info_sv text, ADD COLUMN IF NOT EXISTS info_en text;

ALTER TABLE public.spaces RENAME COLUMN info_sv TO info;

CREATE TABLE public.analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_id TEXT,
  path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX analytics_events_type_created_idx ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX analytics_events_created_idx ON public.analytics_events (created_at DESC);

GRANT SELECT, INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT USAGE ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read analytics events"
  ON public.analytics_events FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can read analytics events" ON public.analytics_events;
CREATE POLICY "Authenticated can read analytics events" ON public.analytics_events FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.analytics_events FROM anon;

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS spaces_slug_unique ON public.spaces (slug) WHERE slug IS NOT NULL;
ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_slug_format_chk;
ALTER TABLE public.spaces ADD CONSTRAINT spaces_slug_format_chk
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS map_url_en text, ADD COLUMN IF NOT EXISTS booking_url_en text;

ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS space_kind text NOT NULL DEFAULT 'study';

ALTER TABLE public.spaces
  DROP CONSTRAINT IF EXISTS spaces_space_kind_check;

ALTER TABLE public.spaces
  ADD CONSTRAINT spaces_space_kind_check CHECK (space_kind IN ('study','service'));

CREATE INDEX IF NOT EXISTS spaces_space_kind_idx ON public.spaces(space_kind);

ALTER TABLE public.spaces DROP CONSTRAINT IF EXISTS spaces_space_kind_check;
ALTER TABLE public.spaces ADD CONSTRAINT spaces_space_kind_check CHECK (space_kind IN ('study','service','creative'));

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS computer_count integer;

UPDATE public.filter_options
SET default_icon = 'Monitor'
WHERE category = 'equipment'
  AND (label = 'Datorer' OR label_en = 'Computers');

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS description_inline boolean NOT NULL DEFAULT false;

ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS informal_seat_count integer;


-- 1. Add columns
ALTER TABLE public.filter_categories ADD COLUMN IF NOT EXISTS special_kind text;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS value_key text;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
ALTER TABLE public.filter_options ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;

-- 2. Drop stale intent category & options (superseded by new arbetssatt category)
DELETE FROM public.filter_options WHERE category = 'intent';
DELETE FROM public.filter_categories WHERE key = 'intent';

-- 3. Seed new special categories
INSERT INTO public.filter_categories (key, title, title_en, style, match_mode, is_single_select, locked, sort_order, special_kind)
VALUES
  ('space_kind', 'Vad letar du efter?', 'What are you looking for?', 'pills', 'any', true, false, 0, 'space_kind'),
  ('arbetssatt', 'Hur vill du arbeta?', 'How do you want to work?', 'pills', 'any', true, false, 1, 'arbetssatt')
ON CONFLICT (key) DO UPDATE SET special_kind = EXCLUDED.special_kind;

-- 4. Seed options for space_kind
INSERT INTO public.filter_options (category, label, label_en, default_icon, sort_order, value_key, is_seed)
VALUES
  ('space_kind', 'En studieplats', 'A study space', 'BookOpen', 10, 'study', true),
  ('space_kind', 'Service & faciliteter', 'Services & facilities', 'Wrench', 20, 'service', true),
  ('space_kind', 'Skapande & paus', 'Creative & break', 'Palette', 30, 'creative', true);

-- 5. Seed options for arbetssatt
INSERT INTO public.filter_options (category, label, label_en, default_icon, sort_order, value_key, is_seed)
VALUES
  ('arbetssatt', 'Enskilt', 'Solo', 'User', 10, 'enskilt', true),
  ('arbetssatt', 'Tillsammans', 'Together', 'Users', 20, 'tillsammans', true),
  ('arbetssatt', 'I grupprum', 'In group room', 'DoorClosed', 30, 'grupprum', true);

-- 6. Replace CHECK on spaces.space_kind with a trigger that validates against filter_options.value_key
DO $$
DECLARE cname text;
BEGIN
  SELECT conname INTO cname FROM pg_constraint
   WHERE conrelid = 'public.spaces'::regclass AND contype = 'c'
     AND pg_get_constraintdef(oid) ILIKE '%space_kind%'
   LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.spaces DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_space_kind()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.space_kind IS NULL OR NEW.space_kind = '' THEN
    NEW.space_kind := 'study';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.filter_options fo
    JOIN public.filter_categories fc ON fc.key = fo.category
    WHERE fc.special_kind = 'space_kind' AND fo.value_key = NEW.space_kind
  ) THEN
    RAISE EXCEPTION 'Invalid space_kind: %', NEW.space_kind;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS validate_space_kind_trg ON public.spaces;
CREATE TRIGGER validate_space_kind_trg
  BEFORE INSERT OR UPDATE OF space_kind ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.validate_space_kind();



-- 1. Roles enum + user_roles table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. has_role security-definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Seed existing users as admin (invite-only project)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Admin-only write policies for spaces
DROP POLICY IF EXISTS "Authenticated can insert spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated can update spaces" ON public.spaces;
DROP POLICY IF EXISTS "Authenticated can delete spaces" ON public.spaces;
CREATE POLICY "Admins can insert spaces" ON public.spaces
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update spaces" ON public.spaces
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete spaces" ON public.spaces
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Admin-only write policies for filter_categories
DROP POLICY IF EXISTS "Authenticated can insert filter categories" ON public.filter_categories;
DROP POLICY IF EXISTS "Authenticated can update filter categories" ON public.filter_categories;
DROP POLICY IF EXISTS "Authenticated can delete filter categories" ON public.filter_categories;
CREATE POLICY "Admins can insert filter categories" ON public.filter_categories
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update filter categories" ON public.filter_categories
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete filter categories" ON public.filter_categories
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin-only write policies for filter_options
DROP POLICY IF EXISTS "Authenticated can insert filter options" ON public.filter_options;
DROP POLICY IF EXISTS "Authenticated can update filter options" ON public.filter_options;
DROP POLICY IF EXISTS "Authenticated can delete filter options" ON public.filter_options;
CREATE POLICY "Admins can insert filter options" ON public.filter_options
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update filter options" ON public.filter_options
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete filter options" ON public.filter_options
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 7. Admin-only write policies for app_settings
DROP POLICY IF EXISTS "Authenticated can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can update app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated can delete app settings" ON public.app_settings;
CREATE POLICY "Admins can insert app settings" ON public.app_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app settings" ON public.app_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete app settings" ON public.app_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Tighten analytics_events reads to admins only (was: any authenticated)
DROP POLICY IF EXISTS "Authenticated can read analytics events" ON public.analytics_events;
CREATE POLICY "Admins can read analytics events" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));


REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.rename_filter_option(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO service_role;

-- Wrap rename_filter_option with an internal admin check so the definer body
-- cannot be misused even if EXECUTE is granted later.
CREATE OR REPLACE FUNCTION public.rename_filter_option(p_category text, p_old_label text, p_new_label text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_col text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_old_label IS NULL OR p_new_label IS NULL OR p_old_label = p_new_label THEN
    RETURN;
  END IF;

  IF p_category IN ('intent','noise','equipment','lokaltyp') THEN
    v_col := p_category;
  ELSIF p_category = 'facility' THEN
    v_col := 'facilities';
  ELSE
    v_col := NULL;
  END IF;

  IF v_col IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET %1$I = array_replace(%1$I, $1, $2) WHERE $1 = ANY(%1$I)',
      v_col
    ) USING p_old_label, p_new_label;
  ELSE
    UPDATE public.spaces
    SET tags = jsonb_set(
      tags,
      ARRAY[p_category],
      to_jsonb(
        (SELECT array_agg(CASE WHEN x = p_old_label THEN p_new_label ELSE x END)
         FROM unnest(ARRAY(SELECT jsonb_array_elements_text(tags->p_category))) AS x)
      )
    )
    WHERE tags ? p_category
      AND tags->p_category @> to_jsonb(p_old_label);
  END IF;
END;
$function$;

-- Re-grant EXECUTE to authenticated; the internal admin check gates it.
GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO authenticated;

ALTER TABLE public.spaces ADD COLUMN hidden boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_spaces_hidden ON public.spaces(hidden);

DROP POLICY IF EXISTS "Authenticated can upload space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete space images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update filter icons" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete filter icons" ON storage.objects;

CREATE POLICY "Admins can upload space images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update space images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete space images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'space-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload filter icons" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update filter icons" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete filter icons" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'filter-icons' AND public.has_role(auth.uid(), 'admin'));


-- 1) Tighten analytics_events INSERT policy: remove WITH CHECK (true), add basic guardrails
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IS NOT NULL
  AND length(event_type) > 0
  AND length(event_type) <= 100
  AND (path IS NULL OR length(path) <= 500)
);

-- 2) Prevent listing of public storage buckets while keeping direct URL access via CDN
DROP POLICY IF EXISTS "Space images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Filter icons publicly readable" ON storage.objects;

-- 3) Restrict SECURITY DEFINER functions so signed-in users cannot invoke them directly.
--    has_role is used only inside RLS/policy evaluation (runs as definer regardless of caller EXECUTE),
--    and rename_filter_option is only called from the admin UI via server context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO service_role;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;