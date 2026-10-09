-- Migration: 20260929120000_rag_multi_tenant_soft_delete.sql
-- Enables Multi-Tenant RAG Knowledge Base, 7-Day Soft Deletion Grace Period, and Store-Scoped Embeddings

-- 1. Ensure Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add deleted_at column to products if not exists
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Index for soft-deleted lifecycle queries
CREATE INDEX IF NOT EXISTS idx_products_deleted_at
  ON public.products (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- is_published was dropped in 20260922000000_enterprise_seller_approval (approval_status).
CREATE INDEX IF NOT EXISTS idx_products_seller_approval
  ON public.products (seller_id, approval_status)
  WHERE deleted_at IS NULL;

-- 4. Store-Scoped Similarity Search RPC with Tenant Isolation
-- Allows Shop Owners to search strictly within their store (seller_id / shop_id),
-- while Admins can pass NULL to search platform-wide or pass specific seller_id to audit a store.
CREATE OR REPLACE FUNCTION public.match_store_products(
  query_embedding text,
  match_count integer DEFAULT 10,
  filter_seller_id uuid DEFAULT NULL,
  filter_shop_id uuid DEFAULT NULL,
  include_deleted boolean DEFAULT FALSE
)
RETURNS TABLE (
  id uuid,
  seller_id uuid,
  shop_id uuid,
  title text,
  description text,
  price numeric,
  stock integer,
  category text,
  sub_category text,
  tags text[],
  image_urls text[],
  approval_status approval_status,
  deleted_at timestamptz,
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.seller_id,
    p.shop_id,
    p.title,
    p.description,
    p.price,
    p.stock,
    p.category,
    p.sub_category,
    p.tags,
    p.image_urls,
    p.approval_status,
    p.deleted_at,
    1 - (p.embedding <=> query_embedding::vector) AS similarity
  FROM public.products p
  WHERE p.embedding IS NOT NULL
    AND (
      -- If filter_seller_id is provided, strictly enforce tenant isolation
      filter_seller_id IS NULL OR p.seller_id = filter_seller_id
    )
    AND (
      -- If filter_shop_id is provided, strictly enforce shop isolation
      filter_shop_id IS NULL OR p.shop_id = filter_shop_id
    )
    AND (
      -- Soft deletion filter
      include_deleted = TRUE OR p.deleted_at IS NULL
    )
  ORDER BY p.embedding <=> query_embedding::vector
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_store_products(text, integer, uuid, uuid, boolean) TO anon, authenticated, service_role;

-- 5. Helper Function to Purge Expired Soft-Deleted Products (> 7 Days Grace Period)
CREATE OR REPLACE FUNCTION public.purge_expired_soft_deleted_products()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged_count integer := 0;
BEGIN
  WITH deleted_rows AS (
    DELETE FROM public.products
    WHERE deleted_at IS NOT NULL
      AND deleted_at < (NOW() - INTERVAL '7 days')
    RETURNING id
  )
  SELECT count(*) INTO purged_count FROM deleted_rows;
  
  RETURN purged_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_soft_deleted_products() TO service_role;

NOTIFY pgrst, 'reload schema';
