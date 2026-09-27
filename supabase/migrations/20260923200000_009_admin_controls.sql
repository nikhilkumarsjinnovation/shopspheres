-- Stop non-admins from changing users.role or users.is_active.
-- Expose marketplace totals only through an admin-only function.
-- ROLLBACK:
--   drop trigger if exists guard_users_role_active on public.users;
--   drop function if exists public.guard_user_privilege();
--   drop function if exists public.admin_platform_stats();

CREATE OR REPLACE FUNCTION public.guard_user_privilege()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  other_admins integer;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role AND NEW.is_active IS NOT DISTINCT FROM OLD.is_active THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin can change role or active status';
  END IF;

  IF auth.uid() IS NOT NULL
     AND OLD.id = auth.uid()
     AND OLD.role = 'admin'
     AND OLD.is_active
     AND (NEW.role <> 'admin' OR NEW.is_active = false) THEN
    SELECT count(*) INTO other_admins
    FROM public.users
    WHERE role = 'admin' AND is_active = true AND id <> OLD.id;
    IF other_admins = 0 THEN
      RAISE EXCEPTION 'The last active admin cannot be demoted or deactivated';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_users_role_active ON public.users;
CREATE TRIGGER guard_users_role_active
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_privilege();

CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access is required';
  END IF;

  RETURN jsonb_build_object(
    'users_customer', (SELECT count(*)::int FROM public.users WHERE role = 'customer'),
    'users_seller', (SELECT count(*)::int FROM public.users WHERE role = 'seller'),
    'users_admin', (SELECT count(*)::int FROM public.users WHERE role = 'admin'),
    'users_active', (SELECT count(*)::int FROM public.users WHERE is_active = true),
    'orders_by_status', (
      SELECT COALESCE(jsonb_object_agg(status, n), '{}'::jsonb)
      FROM (
        SELECT status::text AS status, count(*)::int AS n
        FROM public.orders
        GROUP BY status
      ) counts
    ),
    'gmv', (SELECT COALESCE(sum(total_amount), 0)::float8 FROM public.orders),
    'products_pending', (SELECT count(*)::int FROM public.products WHERE approval_status = 'pending'),
    'products_approved', (SELECT count(*)::int FROM public.products WHERE approval_status = 'approved'),
    'products_rejected', (SELECT count(*)::int FROM public.products WHERE approval_status = 'rejected'),
    'shop_count', (SELECT count(*)::int FROM public.shops),
    'gifts_pending', (SELECT count(*)::int FROM public.gifts WHERE status = 'pending'),
    'low_stock', (SELECT count(*)::int FROM public.products WHERE stock < 5)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;
