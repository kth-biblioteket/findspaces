
CREATE OR REPLACE FUNCTION public.filter_storage_column(p_category text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_category IN ('intent','noise','equipment','lokaltyp') THEN p_category
    WHEN p_category = 'facility' THEN 'facilities'
    ELSE NULL
  END
$$;

CREATE OR REPLACE FUNCTION public.array_replace_dedupe(arr text[], p_old text, p_new text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  WITH mapped AS (
    SELECT CASE WHEN x = p_old THEN p_new ELSE x END AS v, o
    FROM unnest(coalesce(arr, '{}'::text[])) WITH ORDINALITY t(x, o)
  ), grouped AS (
    SELECT v, min(o) AS o FROM mapped GROUP BY v
  )
  SELECT coalesce((SELECT array_agg(v ORDER BY o) FROM grouped), '{}'::text[])
$$;

CREATE OR REPLACE FUNCTION public.array_remove_value(arr text[], p_val text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT coalesce(array_remove(coalesce(arr, '{}'::text[]), p_val), '{}'::text[])
$$;

CREATE OR REPLACE FUNCTION public.array_add_value(arr text[], p_val text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE WHEN p_val = ANY(coalesce(arr, '{}'::text[]))
    THEN coalesce(arr, '{}'::text[])
    ELSE coalesce(arr, '{}'::text[]) || p_val END
$$;

-- Rename: keep the value on every space that already has it, de-duplicated.
CREATE OR REPLACE FUNCTION public.rename_filter_option(p_category text, p_old_label text, p_new_label text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_col text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_old_label IS NULL OR p_new_label IS NULL OR p_old_label = p_new_label THEN
    RETURN;
  END IF;

  v_col := public.filter_storage_column(p_category);

  IF v_col IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET %1$I = public.array_replace_dedupe(%1$I, $1, $2) WHERE $1 = ANY(%1$I)',
      v_col
    ) USING p_old_label, p_new_label;
  ELSE
    UPDATE public.spaces
    SET tags = jsonb_set(
      tags,
      ARRAY[p_category],
      to_jsonb(public.array_replace_dedupe(
        ARRAY(SELECT jsonb_array_elements_text(tags->p_category)),
        p_old_label, p_new_label))
    )
    WHERE tags ? p_category
      AND tags->p_category @> to_jsonb(p_old_label);
  END IF;
END;
$$;

-- Move a filter option to another category, carrying the value on all spaces.
CREATE OR REPLACE FUNCTION public.move_filter_option(p_option_id uuid, p_new_category text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old_category text;
  v_label text;
  v_from text;
  v_to text;
  v_key text;
  v_base text;
  i int := 1;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT category, label, value_key INTO v_old_category, v_label, v_key
  FROM public.filter_options WHERE id = p_option_id;

  IF v_old_category IS NULL OR p_new_category IS NULL OR v_old_category = p_new_category THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.filter_categories WHERE key = p_new_category) THEN
    RAISE EXCEPTION 'Unknown category: %', p_new_category;
  END IF;

  v_from := public.filter_storage_column(v_old_category);
  v_to := public.filter_storage_column(p_new_category);

  IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET %1$I = public.array_add_value(%1$I, $1), %2$I = public.array_remove_value(%2$I, $1) WHERE $1 = ANY(%2$I)',
      v_to, v_from
    ) USING v_label;
  ELSIF v_from IS NOT NULL AND v_to IS NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET tags = jsonb_set(tags, ARRAY[$2], to_jsonb(public.array_add_value(ARRAY(SELECT jsonb_array_elements_text(coalesce(tags->$2, ''[]''::jsonb))), $1))), %1$I = public.array_remove_value(%1$I, $1) WHERE $1 = ANY(%1$I)',
      v_from
    ) USING v_label, p_new_category;
  ELSIF v_from IS NULL AND v_to IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces SET %1$I = public.array_add_value(%1$I, $1), tags = jsonb_set(tags, ARRAY[$2], to_jsonb(public.array_remove_value(ARRAY(SELECT jsonb_array_elements_text(tags->$2)), $1))) WHERE tags ? $2 AND tags->$2 @> to_jsonb($1)',
      v_to
    ) USING v_label, v_old_category;
  ELSE
    UPDATE public.spaces
    SET tags = jsonb_set(
          jsonb_set(
            tags,
            ARRAY[p_new_category],
            to_jsonb(public.array_add_value(
              ARRAY(SELECT jsonb_array_elements_text(coalesce(tags->p_new_category, '[]'::jsonb))), v_label))
          ),
          ARRAY[v_old_category],
          to_jsonb(public.array_remove_value(
            ARRAY(SELECT jsonb_array_elements_text(tags->v_old_category)), v_label))
        )
    WHERE tags ? v_old_category
      AND tags->v_old_category @> to_jsonb(v_label);
  END IF;

  -- Keep value_key unique within the destination category.
  v_base := coalesce(nullif(v_key, ''), public.slugify_filter_value(v_label));
  v_key := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.filter_options
    WHERE category = p_new_category AND value_key = v_key AND id <> p_option_id
  ) LOOP
    i := i + 1;
    v_key := v_base || '_' || i;
  END LOOP;

  UPDATE public.filter_options
  SET category = p_new_category, value_key = v_key, sort_order = 999
  WHERE id = p_option_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_filter_option(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.move_filter_option(uuid, text) TO authenticated;
