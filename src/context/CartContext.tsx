'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  addItem,
  getCart,
  syncToServer,
  updateQuantity as setItemQuantity,
  type CartItem,
  type CartProductInput,
} from '@/services/cart-service';

export type { CartItem };

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: CartProductInput) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function CartProvider({ children, userId: propUserId }: CartProviderProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(propUserId ?? null);
  const [loadedUserId, setLoadedUserId] = useState<string | null | undefined>(undefined);

  // Keep activeUserId synchronized with propUserId
  useEffect(() => {
    if (propUserId) {
      setActiveUserId(propUserId);
    }
  }, [propUserId]);

  // Auth listener to detect login, logout, or account switches
  useEffect(() => {
    const supabase = createClient();

    if (!propUserId) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setActiveUserId(user?.id ?? null);
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActiveUserId(null);
        setLoadedUserId(undefined);
        setCart([]);
      } else if (session?.user) {
        setActiveUserId(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [propUserId]);

  // Hydrate cart from localStorage whenever activeUserId is determined or changed
  useEffect(() => {
    // Clean up legacy un-scoped key if present
    try {
      localStorage.removeItem('shopsphere_cart');
    } catch {
      // Ignore
    }

    try {
      const stored = getCart(activeUserId);
      setCart(stored);
    } catch {
      setCart([]);
    }
    setLoadedUserId(activeUserId);
  }, [activeUserId]);

  // Persist cart to localStorage only when cart belongs to the loaded user
  useEffect(() => {
    if (loadedUserId === undefined || loadedUserId !== activeUserId) {
      return;
    }
    try {
      localStorage.removeItem('shopsphere_cart');
      syncToServer(activeUserId, cart);
    } catch {
      // Ignore localStorage write error
    }
  }, [cart, activeUserId, loadedUserId]);

  const addToCart = (product: CartProductInput) => {
    setCart((prev) => addItem(prev, product));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('shopsphere:track', {
        detail: {
          eventType: 'add_to_cart',
          entityType: 'product',
          entityId: product.id,
          metadata: { category: product.category ?? null, price: Number(product.price) },
        },
      }));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => setItemQuantity(prev, productId, 0));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((prev) => setItemQuantity(prev, productId, quantity));
  };

  const clearCart = () => {
    setCart([]);
    const storageKey = activeUserId ? `shopsphere_cart_${activeUserId}` : 'shopsphere_cart_guest';
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
