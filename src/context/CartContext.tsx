'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on initial mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shopsphere_cart');
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage read error
    }
    setMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem('shopsphere_cart', JSON.stringify(cart));
      } catch {
        // Ignore localStorage write error
      }
    }
  }, [cart, mounted]);

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
