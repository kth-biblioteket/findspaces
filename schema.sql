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