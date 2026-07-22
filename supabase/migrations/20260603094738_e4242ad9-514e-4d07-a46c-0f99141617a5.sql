
-- Cascade rename function for filter options
CREATE OR REPLACE FUNCTION public.rename_filter_option(
  p_category text,
  p_old_label text,
  p_new_label text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO authenticated, service_role;

-- Fix existing stale data from prior rename "Lite rörelse" -> "Mindre rörelse"
SELECT public.rename_filter_option('miljo_och_intryck', 'Lite rörelse', 'Mindre rörelse');
SELECT public.rename_filter_option('miljo_och_intryck', 'Lite spring/rörelse', 'Mindre rörelse');
