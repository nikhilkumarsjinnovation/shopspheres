-- Allow campaign recipients to read their sends and mark opened_at (in-app banner).
-- Also allow reading the parent campaign row for discount/name on the banner.
-- ROLLBACK:
--   drop policy if exists "campaigns_recipient_select" on public.campaigns;
--   drop policy if exists "campaign_sends_owner_update" on public.campaign_sends;
--   drop policy if exists "campaign_sends_owner_select" on public.campaign_sends;

DROP POLICY IF EXISTS "campaign_sends_owner_select" ON public.campaign_sends;
CREATE POLICY "campaign_sends_owner_select" ON public.campaign_sends
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "campaign_sends_owner_update" ON public.campaign_sends;
CREATE POLICY "campaign_sends_owner_update" ON public.campaign_sends
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "campaigns_recipient_select" ON public.campaigns;
CREATE POLICY "campaigns_recipient_select" ON public.campaigns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_sends s
      WHERE s.campaign_id = id
        AND s.user_id = (SELECT auth.uid())
    )
  );
