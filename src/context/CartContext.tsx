'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface CartItem {
  id: string; // product_id
  title: string;
  price: number;
  quantity: number;
  seller_id: string;
  image_url?: string | null;
  category?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    image_url?: string | null;
    category?: string;
  }) => void;
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

    const storageKey = activeUserId ? `shopsphere_cart_${activeUserId}` : 'shopsphere_cart_guest';
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setCart(JSON.parse(stored));
      } else {
        setCart([]);
      }
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
    const storageKey = activeUserId ? `shopsphere_cart_${activeUserId}` : 'shopsphere_cart_guest';
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      // Ignore localStorage write error
    }
  }, [cart, activeUserId, loadedUserId]);

  const addToCart = (product: {
    id: string;
    title: string;
    price: number;
    seller_id: string;
    image_url?: string | null;
    category?: string;
  }) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.title,
          price: Number(product.price),
          quantity: 1,
          seller_id: product.seller_id,
          image_url: product.image_url,
          category: product.category,
        },
      ];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity } : item))
    );
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
