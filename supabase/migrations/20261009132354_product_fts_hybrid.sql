-- Assessment 3 Branch 4: Postgres full-text search for hybrid retrieval (FTS ∪ cosine).
-- Author only — do not apply from the agent. Reviewer: supabase db push.
-- Note: to_tsvector is STABLE, not IMMUTABLE, so GENERATED ALWAYS columns fail (42P17).
-- Use a plain tsvector column maintained by a BEFORE INSERT/UPDATE trigger instead.
-- ROLLBACK:
--   drop function if exists public.match_products_fts(text, integer, uuid, uuid);
--   drop trigger if exists products_search_tsv_trg on public.products;
--   drop function if exists public.products_search_tsv_update();
--   drop index if exists public.idx_products_search_tsv;
--   alter table public.products drop column if exists search_tsv;

alter table public.products
  add column if not exists search_tsv tsvector;

create or replace function public.products_search_tsv_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A')
    || setweight(to_tsvector('english', coalesce(new.category, '')), 'B')
    || setweight(to_tsvector('english', coalesce(new.sub_category, '')), 'B')
    || setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'C')
    || setweight(to_tsvector('english', coalesce(new.description, '')), 'D');
  return new;
end;
$$;

drop trigger if exists products_search_tsv_trg on public.products;
create trigger products_search_tsv_trg
  before insert or update of title, description, category, sub_category, tags
  on public.products
  for each row
  execute function public.products_search_tsv_update();

-- Backfill existing rows (trigger does not fire on this UPDATE of search_tsv alone;
-- recompute explicitly so the GIN index is useful immediately).
update public.products
set search_tsv =
  setweight(to_tsvector('english', coalesce(title, '')), 'A')
  || setweight(to_tsvector('english', coalesce(category, '')), 'B')
  || setweight(to_tsvector('english', coalesce(sub_category, '')), 'B')
  || setweight(to_tsvector('english', coalesce(array_to_string(tags, ' '), '')), 'C')
  || setweight(to_tsvector('english', coalesce(description, '')), 'D')
where search_tsv is null;

create index if not exists idx_products_search_tsv
  on public.products
  using gin (search_tsv);

create or replace function public.match_products_fts(
  query_text text,
  match_count integer default 20,
  p_seller_id uuid default null,
  p_shop_id uuid default null
)
returns table (
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
  approval_status public.approval_status,
  deleted_at timestamptz,
  ts_rank double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  select
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
    ts_rank(p.search_tsv, websearch_to_tsquery('english', query_text))::double precision as ts_rank
  from public.products p
  where p.search_tsv is not null
    and p.search_tsv @@ websearch_to_tsquery('english', query_text)
    and p.deleted_at is null
    and (p_seller_id is null or p.seller_id = p_seller_id)
    and (p_shop_id is null or p.shop_id = p_shop_id)
  order by ts_rank desc
  limit greatest(1, least(coalesce(match_count, 20), 100));
$$;

grant execute on function public.match_products_fts(text, integer, uuid, uuid)
  to authenticated, service_role;
