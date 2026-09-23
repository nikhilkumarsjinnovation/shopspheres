-- Phase 2.1 product embeddings for visual and text similarity search.
-- vector extension is created in 20260923120000_002_vision_features.sql.
-- NOT APPLIED. ROLLBACK: drop function public.match_products; alter table public.products drop column if exists embedding;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

CREATE INDEX IF NOT EXISTS idx_products_embedding_user
  ON public.products (id)
  WHERE embedding IS NOT NULL;

CREATE OR REPLACE FUNCTION public.match_products(query_embedding vector(1536), match_count integer)
RETURNS TABLE (
  id uuid,
  title text,
  price numeric,
  category text,
  image_urls text[],
  similarity double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    p.price,
    p.category,
    p.image_urls,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM public.products p
  WHERE p.approval_status = 'approved'
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
$$;
