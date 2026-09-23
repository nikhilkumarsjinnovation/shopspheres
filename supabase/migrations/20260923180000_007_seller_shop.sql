-- One shop per seller, branding edit counter, product resubmit counter,
-- and seller tracking inserts for their own order lines.
-- ROLLBACK:
--   drop index if exists shops_seller_id_unique;
--   alter table public.shops drop column if exists branding_edits_used;
--   alter table public.products drop column if exists resubmit_count;
--   drop policy if exists tracking_seller_insert_policy on public.order_tracking_events;
--   drop policy if exists tracking_seller_read_policy on public.order_tracking_events;
--   drop policy if exists orders_seller_read_policy on public.orders;

CREATE UNIQUE INDEX IF NOT EXISTS shops_seller_id_unique ON public.shops (seller_id);

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS branding_edits_used integer NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS resubmit_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "orders_seller_read_policy" ON public.orders;
CREATE POLICY "orders_seller_read_policy" ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = orders.id AND oi.seller_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_seller_read_policy" ON public.order_tracking_events;
CREATE POLICY "tracking_seller_read_policy" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = order_tracking_events.order_id
        AND oi.seller_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "tracking_seller_insert_policy" ON public.order_tracking_events;
CREATE POLICY "tracking_seller_insert_policy" ON public.order_tracking_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      WHERE oi.order_id = order_tracking_events.order_id
        AND oi.seller_id = (SELECT auth.uid())
    )
  );
