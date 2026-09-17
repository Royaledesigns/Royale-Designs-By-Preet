'use client';

import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'royale-designs-cart';

function loadCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors (private browsing, etc.)
    }
  }, [items, hydrated]);

  // These are wrapped in useCallback (and use the functional setState form,
  // so they don't need `items` as a dependency) to keep a stable function
  // identity across renders. Without that, a component whose effect depends
  // on one of these — like the checkout success page clearing the cart once
  // it loads — would see a "new" function on every render and re-fire
  // forever: clear → re-render → new function reference → effect fires
  // again → clear → ... an infinite loop that pins the tab and makes the
  // whole page look frozen (this was actually happening on /checkout/success).
  const addItem = useCallback((product, size, qty = 1) => {
    setItems((prev) => {
      const key = `${product.handle}__${size}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      return [
        ...prev,
        {
          key,
          handle: product.handle,
          title: product.title,
          price: product.price,
          image: product.image,
          size,
          qty,
        },
      ];
    });
  }, []);

  const updateQty = useCallback((key, qty) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, qty } : i))
    );
  }, []);

  const removeItem = useCallback((key) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);

  // Memoized so consumers relying on reference equality (e.g. an effect
  // dependency array) don't see a "new" context value on every render.
  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, clearCart, subtotal, count, hydrated }),
    [items, addItem, updateQty, removeItem, clearCart, subtotal, count, hydrated]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
