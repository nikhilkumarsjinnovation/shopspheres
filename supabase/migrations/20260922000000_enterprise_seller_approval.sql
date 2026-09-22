-- ==============================================================================
-- ShopSphere Phase 1 Enterprise Upgrade: Product Approval Workflow & Specifications
-- Migration: 20260922000000_enterprise_seller_approval.sql
-- ==============================================================================

-- 1. Create enum for product approval lifecycle
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

-- 2. Add enterprise marketplace columns to products table
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approval_status approval_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS condition TEXT NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3. Drop existing policies that depend on legacy columns before dropping is_published
DROP POLICY IF EXISTS "products_read_policy" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

-- 4. Safely migrate existing records and drop legacy is_published boolean
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_published'
  ) THEN
    UPDATE public.products 
    SET approval_status = CASE 
      WHEN is_published = TRUE THEN 'approved'::approval_status 
      ELSE 'pending'::approval_status 
    END;
    
    ALTER TABLE public.products DROP COLUMN is_published CASCADE;
  END IF;
END $$;

-- 5. Recreate Row Level Security (RLS) Policies on public.products

-- 5.1 Read Policy: Customers see approved only; Sellers see their own; Admins see all
CREATE POLICY "products_read_policy" ON public.products
  FOR SELECT
  TO public
  USING (
    approval_status = 'approved'
    OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
    OR public.is_admin()
  );

-- 5.2 Insert Policy: Authenticated sellers inserting their own products
CREATE POLICY "products_insert_policy" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_seller()
    AND seller_id = auth.uid()
  );

-- 5.3 Update Policy: Sellers update their own; Admins can update any product (e.g. approve/reject)
CREATE POLICY "products_update_policy" ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    (seller_id = auth.uid() AND public.is_seller())
    OR public.is_admin()
  )
  WITH CHECK (
    (seller_id = auth.uid() AND public.is_seller())
    OR public.is_admin()
  );

-- 5.4 Delete Policy: Sellers delete their own; Admins can delete
CREATE POLICY "products_delete_policy" ON public.products
  FOR DELETE
  TO authenticated
  USING (
    (seller_id = auth.uid() AND public.is_seller())
    OR public.is_admin()
  );

-- 5. Create index for fast approval queue queries
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON public.products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_seller_category ON public.products(seller_id, category);
