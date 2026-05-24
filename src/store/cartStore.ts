import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
  loadCart: () => Promise<void>;
}

const CART_KEY = 'shopapp_cart';

const saveCart = async (items: CartItem[]) => {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  loadCart: async () => {
    const saved = await AsyncStorage.getItem(CART_KEY);
    if (saved) set({ items: JSON.parse(saved) });
  },

  addItem: (product) => {
    const items = get().items;
    const existing = items.find((i) => i.product.id === product.id);
    let newItems: CartItem[];
    if (existing) {
      newItems = items.map((i) =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      );
    } else {
      newItems = [...items, { product, quantity: 1 }];
    }
    set({ items: newItems });
    saveCart(newItems);
  },

  removeItem: (productId) => {
    const newItems = get().items.filter((i) => i.product.id !== productId);
    set({ items: newItems });
    saveCart(newItems);
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    const newItems = get().items.map((i) =>
      i.product.id === productId ? { ...i, quantity } : i
    );
    set({ items: newItems });
    saveCart(newItems);
  },

  clearCart: () => {
    set({ items: [] });
    AsyncStorage.removeItem(CART_KEY);
  },

  total: () => get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

  itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
