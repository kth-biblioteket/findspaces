CREATE OR REPLACE FUNCTION public.move_filter_option(p_option_id uuid, p_new_category text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_old_category text;
  v_label text;
  v_from text;
  v_to text;
  v_key text;
  v_base text;
  i integer := 1;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT category, label, value_key
    INTO v_old_category, v_label, v_key
  FROM public.filter_options
  WHERE id = p_option_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown filter option: %', p_option_id;
  END IF;

  IF p_new_category IS NULL OR v_old_category = p_new_category THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.filter_categories
    WHERE key = p_new_category
      AND special_kind IS NULL
  ) THEN
    RAISE EXCEPTION 'Unknown or protected category: %', p_new_category;
  END IF;

  v_from := public.filter_storage_column(v_old_category);
  v_to := public.filter_storage_column(p_new_category);

  IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces
       SET %1$I = public.array_add_value(%1$I, $1),
           %2$I = public.array_remove_value(%2$I, $1)
       WHERE $1 = ANY(%2$I)',
      v_to, v_from
    ) USING v_label;
  ELSIF v_from IS NOT NULL AND v_to IS NULL THEN
    EXECUTE format(
      'UPDATE public.spaces
       SET tags = jsonb_set(
             coalesce(tags, ''{}''::jsonb),
             ARRAY[$2::text],
             to_jsonb(public.array_add_value(
               ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> $2::text, ''[]''::jsonb))),
               $1::text
             )),
             true
           ),
           %1$I = public.array_remove_value(%1$I, $1)
       WHERE $1 = ANY(%1$I)',
      v_from
    ) USING v_label, p_new_category;
  ELSIF v_from IS NULL AND v_to IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.spaces
       SET %1$I = public.array_add_value(%1$I, $1),
           tags = CASE
             WHEN public.array_remove_value(
               ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> $2::text, ''[]''::jsonb))),
               $1::text
             ) = ''{}''::text[]
             THEN coalesce(tags, ''{}''::jsonb) - $2::text
             ELSE jsonb_set(
               coalesce(tags, ''{}''::jsonb),
               ARRAY[$2::text],
               to_jsonb(public.array_remove_value(
                 ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> $2::text, ''[]''::jsonb))),
                 $1::text
               )),
               true
             )
           END
       WHERE coalesce(tags -> $2::text, ''[]''::jsonb) @> jsonb_build_array($1::text)',
      v_to
    ) USING v_label, v_old_category;
  ELSE
    UPDATE public.spaces
    SET tags = CASE
      WHEN public.array_remove_value(
        ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> v_old_category, '[]'::jsonb))),
        v_label
      ) = '{}'::text[]
      THEN jsonb_set(
        coalesce(tags, '{}'::jsonb) - v_old_category,
        ARRAY[p_new_category],
        to_jsonb(public.array_add_value(
          ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> p_new_category, '[]'::jsonb))),
          v_label
        )),
        true
      )
      ELSE jsonb_set(
        jsonb_set(
          coalesce(tags, '{}'::jsonb),
          ARRAY[p_new_category],
          to_jsonb(public.array_add_value(
            ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> p_new_category, '[]'::jsonb))),
            v_label
          )),
          true
        ),
        ARRAY[v_old_category],
        to_jsonb(public.array_remove_value(
          ARRAY(SELECT jsonb_array_elements_text(coalesce(tags -> v_old_category, '[]'::jsonb))),
          v_label
        )),
        true
      )
    END
    WHERE coalesce(tags -> v_old_category, '[]'::jsonb) @> jsonb_build_array(v_label);
  END IF;

  v_base := coalesce(nullif(v_key, ''), public.slugify_filter_value(v_label));
  v_key := v_base;
  WHILE EXISTS (
    SELECT 1
    FROM public.filter_options
    WHERE category = p_new_category
      AND value_key = v_key
      AND id <> p_option_id
  ) LOOP
    i := i + 1;
    v_key := v_base || '_' || i;
  END LOOP;

  UPDATE public.filter_options
  SET category = p_new_category,
      value_key = v_key,
      sort_order = 999
  WHERE id = p_option_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.move_filter_option(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_filter_option(uuid, text) TO authenticated, service_role;