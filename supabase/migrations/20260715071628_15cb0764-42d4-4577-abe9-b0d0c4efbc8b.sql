
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
