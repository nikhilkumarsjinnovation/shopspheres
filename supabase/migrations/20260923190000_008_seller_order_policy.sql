-- Seller order policies must not SELECT order_items under RLS.
-- order_items_read_policy already SELECTs orders, so the 007 policies recurse.
-- ROLLBACK:
--   drop policy if exists tracking_seller_insert_policy on public.order_tracking_events;
--   drop policy if exists tracking_seller_read_policy on public.order_tracking_events;
--   drop policy if exists orders_seller_read_policy on public.orders;
--   drop function if exists public.seller_owns_order(uuid);

CREATE OR REPLACE FUNCTION public.seller_owns_order(target_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items
    WHERE order_id = target_order_id
      AND seller_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.seller_owns_order(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_owns_order(uuid) TO authenticated;

DROP POLICY IF EXISTS "orders_seller_read_policy" ON public.orders;
CREATE POLICY "orders_seller_read_policy" ON public.orders
  FOR SELECT TO authenticated
  USING (public.seller_owns_order(orders.id));

DROP POLICY IF EXISTS "tracking_seller_read_policy" ON public.order_tracking_events;
CREATE POLICY "tracking_seller_read_policy" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (public.seller_owns_order(order_tracking_events.order_id));

DROP POLICY IF EXISTS "tracking_seller_insert_policy" ON public.order_tracking_events;
CREATE POLICY "tracking_seller_insert_policy" ON public.order_tracking_events
  FOR INSERT TO authenticated
  WITH CHECK (public.seller_owns_order(order_tracking_events.order_id));
