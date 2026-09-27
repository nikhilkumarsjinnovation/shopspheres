-- Migration: 20260927210000_customer_super_agent_wallet_favorites.sql
-- Enables In-App Customer Wallet, Wallet Transactions, Favorites / Wishlist, and Agent Order Attribution

-- 1. In-App Customer Wallets
CREATE TABLE IF NOT EXISTS public.user_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0.00),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    is_frozen BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_wallets_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets(user_id);

-- 2. Wallet Transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0.00),
    type VARCHAR(10) NOT NULL CHECK (type IN ('credit', 'debit')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    reference_type VARCHAR(30) NOT NULL CHECK (reference_type IN ('order_payment', 'wallet_topup', 'order_refund', 'gift_purchase')),
    reference_id VARCHAR(100),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);

-- 3. Customer Favorites / Wishlist
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_favorite UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product ON public.user_favorites(product_id);

-- 4. Extend Orders table with Agent Attribution & Cancellation Deadline
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS placed_by VARCHAR(20) NOT NULL DEFAULT 'customer';

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS agent_cancellation_deadline TIMESTAMPTZ;

-- 5. Atomic Debit Stored Procedure (Row-Level Locking FOR UPDATE)
CREATE OR REPLACE FUNCTION public.process_wallet_debit(
    p_user_id UUID,
    p_amount NUMERIC(12, 2),
    p_reference_type VARCHAR(30),
    p_reference_id VARCHAR(100),
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_tx_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid debit amount.');
    END IF;

    -- Lock wallet row to prevent race conditions & double-spending
    SELECT id, balance, is_frozen INTO v_wallet
    FROM public.user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet not found for this user.');
    END IF;

    IF v_wallet.is_frozen THEN
        RETURN jsonb_build_object('success', false, 'error', 'Wallet is suspended. Contact support.');
    END IF;

    IF v_wallet.balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Insufficient wallet balance.',
            'current_balance', v_wallet.balance,
            'required_amount', p_amount
        );
    END IF;

    -- Deduct balance
    UPDATE public.user_wallets
    SET balance = balance - p_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_wallet.id;

    -- Insert ledger transaction
    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, amount, type, status, reference_type, reference_id, description
    ) VALUES (
        v_wallet.id, p_user_id, p_amount, 'debit', 'completed', p_reference_type, p_reference_id, p_description
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'remaining_balance', v_wallet.balance - p_amount
    );
END;
$$;

-- 6. Atomic Wallet Refund Procedure (Credits 100% back on cancellation)
CREATE OR REPLACE FUNCTION public.process_wallet_refund(
    p_user_id UUID,
    p_amount NUMERIC(12, 2),
    p_order_id VARCHAR(100),
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet RECORD;
    v_tx_id UUID;
    v_new_balance NUMERIC(12, 2);
BEGIN
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid refund amount.');
    END IF;

    SELECT id, balance INTO v_wallet
    FROM public.user_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.user_wallets (user_id, balance)
        VALUES (p_user_id, p_amount)
        RETURNING id, balance INTO v_wallet;
        v_new_balance := p_amount;
    ELSE
        v_new_balance := v_wallet.balance + p_amount;
        UPDATE public.user_wallets
        SET balance = v_new_balance,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_wallet.id;
    END IF;

    INSERT INTO public.wallet_transactions (
        wallet_id, user_id, amount, type, status, reference_type, reference_id, description
    ) VALUES (
        v_wallet.id, p_user_id, p_amount, 'credit', 'completed', 'order_refund', p_order_id, p_description
    ) RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_tx_id,
        'new_balance', v_new_balance
    );
END;
$$;
