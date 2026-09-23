-- PostgREST cannot match a JSON string to match_products(vector, integer).
-- Replace that overload with a text argument and cast inside the function.
-- ROLLBACK: drop function if exists public.match_products(text, integer);

CREATE EXTENSION IF NOT EXISTS vector;

DROP FUNCTION IF EXISTS public.match_products(vector, integer);

CREATE OR REPLACE FUNCTION public.match_products(query_embedding text, match_count integer)
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
    1 - (p.embedding <=> query_embedding::vector) AS similarity
  FROM public.products p
  WHERE p.approval_status = 'approved'
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> query_embedding::vector
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_products(text, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
