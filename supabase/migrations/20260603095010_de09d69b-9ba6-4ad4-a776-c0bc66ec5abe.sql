REVOKE ALL ON FUNCTION public.rename_filter_option(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_filter_option(text, text, text) TO authenticated, service_role;