-- Friend lookup and share-link attribution bypass customer RLS safely.
-- users has email, not phone or username.
-- ROLLBACK:
--   drop function if exists public.lookup_user_id_by_email(text);
--   drop function if exists public.record_share_open(text);

CREATE OR REPLACE FUNCTION public.lookup_user_id_by_email(target_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users
  WHERE lower(email) = lower(target_email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.record_share_open(target_token text)
RETURNS TABLE (
  product_id uuid,
  sharer_name text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_products
  SET
    status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
    viewed_at = COALESCE(viewed_at, NOW())
  WHERE deep_link_token = target_token;

  RETURN QUERY
  SELECT s.product_id, COALESCE(u.full_name, u.email), s.status
  FROM public.shared_products s
  JOIN public.users u ON u.id = s.sharer_id
  WHERE s.deep_link_token = target_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.lookup_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_share_open(text) TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'group_gift_contributions'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_gift_contributions;
    END IF;
  END IF;
END $$;
