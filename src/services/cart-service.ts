export interface CartItem {
  id: string;
  title: string;
  price: number;
  quantity: number;
  seller_id: string;
  image_url?: string | null;
  category?: string;
}

export interface CartProductInput {
  id: string;
  title: string;
  price: number;
  seller_id: string;
  image_url?: string | null;
  category?: string;
}

export const GUEST_CART_KEY = 'shopsphere_cart_guest';

export function cartStorageKey(userId: string | null): string {
  return userId ? `shopsphere_cart_${userId}` : GUEST_CART_KEY;
}

function readKey(key: string): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed as CartItem[] : [];
  } catch {
    return [];
  }
}

function writeKey(key: string, cart: CartItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(cart));
}

export function getCart(userId: string | null): CartItem[] {
  return readKey(cartStorageKey(userId));
}

export function addItem(cart: CartItem[], product: CartProductInput): CartItem[] {
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    return cart.map((item) =>
      item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }
  return [
    ...cart,
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
}

export function updateQuantity(cart: CartItem[], productId: string, quantity: number): CartItem[] {
  if (quantity <= 0) {
    return cart.filter((item) => item.id !== productId);
  }
  return cart.map((item) => (item.id === productId ? { ...item, quantity } : item));
}

export function mergeGuestCart(userId: string): CartItem[] {
  const guest = readKey(GUEST_CART_KEY);
  const userCart = readKey(cartStorageKey(userId));
  const merged = [...userCart];

  for (const item of guest) {
    const existing = merged.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      merged.push(item);
    }
  }

  writeKey(cartStorageKey(userId), merged);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(GUEST_CART_KEY);
  }
  return merged;
}

/**
 * There is no carts table in the generated database types.
 * This persists the cart in the signed-in browser until a server cart exists.
 */
export function syncToServer(userId: string | null, cart: CartItem[]): CartItem[] {
  writeKey(cartStorageKey(userId), cart);
  return cart;
}
