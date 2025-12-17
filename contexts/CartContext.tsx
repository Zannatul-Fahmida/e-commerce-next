"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { supabase, getUserCached } from '@/lib/supabase';
import { toast } from 'sonner';

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  selected_option?: string;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    cover_image: string;
    stock: number;
    options?: any[];
  };
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  totalItems: number;
  totalAmount: number;
}

type CartAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ITEMS'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_ITEM'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'CLEAR_CART' };

interface CartContextType extends CartState {
  addToCart: (productId: string, quantity?: number, selectedOption?: string) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_ITEMS':
      const items = action.payload;
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = items.reduce((sum, item) => {
        const price = item.product.discount_price || item.product.price;
        return sum + (price * item.quantity);
      }, 0);
      return { ...state, items, totalItems, totalAmount };
    
    case 'ADD_ITEM':
      const newItems = [...state.items, action.payload];
      const newTotalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
      const newTotalAmount = newItems.reduce((sum, item) => {
        const price = item.product.discount_price || item.product.price;
        return sum + (price * item.quantity);
      }, 0);
      return { ...state, items: newItems, totalItems: newTotalItems, totalAmount: newTotalAmount };
    
    case 'UPDATE_ITEM':
      const updatedItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, quantity: action.payload.quantity }
          : item
      );
      const updatedTotalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
      const updatedTotalAmount = updatedItems.reduce((sum, item) => {
        const price = item.product.discount_price || item.product.price;
        return sum + (price * item.quantity);
      }, 0);
      return { ...state, items: updatedItems, totalItems: updatedTotalItems, totalAmount: updatedTotalAmount };
    
    case 'REMOVE_ITEM':
      const filteredItems = state.items.filter(item => item.id !== action.payload);
      const filteredTotalItems = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
      const filteredTotalAmount = filteredItems.reduce((sum, item) => {
        const price = item.product.discount_price || item.product.price;
        return sum + (price * item.quantity);
      }, 0);
      return { ...state, items: filteredItems, totalItems: filteredTotalItems, totalAmount: filteredTotalAmount };
    
    case 'CLEAR_CART':
      return { ...state, items: [], totalItems: 0, totalAmount: 0 };
    
    default:
      return state;
  }
};

const initialState: CartState = {
  items: [],
  loading: false,
  totalItems: 0,
  totalAmount: 0,
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // Fetch cart items on mount and when user changes
  useEffect(() => {
    const fetchCart = async () => {
      const { data: { user } } = await getUserCached();
      if (user) {
        await refreshCart();
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => fetchCart());
    } else {
      setTimeout(() => fetchCart(), 0);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        refreshCart();
      } else if (event === 'SIGNED_OUT') {
        dispatch({ type: 'CLEAR_CART' });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const { data: { user } } = await getUserCached();
      if (!user) {
        dispatch({ type: 'CLEAR_CART' });
        return;
      }

      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            discount_price,
            cover_image,
            stock,
            options
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cart:', error);
        toast.error('Failed to load cart');
        return;
      }

      dispatch({ type: 'SET_ITEMS', payload: data || [] });
    } catch (error) {
      console.error('Error refreshing cart:', error);
      toast.error('Failed to refresh cart');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const addToCart = async (productId: string, quantity = 1, selectedOption?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to add items to cart');
        return;
      }

      // Check if item already exists in cart
      // Normalize selectedOption to handle null/undefined comparison
      const normalizedSelectedOption = selectedOption || null;
      const existingItem = state.items.find(
        item => item.product_id === productId && (item.selected_option || null) === normalizedSelectedOption
      );

      if (existingItem) {
        // Update quantity if item exists
        await updateQuantity(existingItem.id, existingItem.quantity + quantity);
        return;
      }

      // Get product details first
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, price, discount_price, cover_image, stock, options')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        toast.error('Product not found');
        return;
      }

      // Check stock
      if (product.stock < quantity) {
        toast.error('Not enough stock available');
        return;
      }

      // Add to cart
      const { data, error } = await supabase
        .from('cart')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          selected_option: normalizedSelectedOption,
        })
        .select(`
          *,
          product:products (
            id,
            name,
            price,
            discount_price,
            cover_image,
            stock,
            options
          )
        `)
        .single();

      if (error) {
        console.error('Error adding to cart:', error);
        toast.error('Failed to add item to cart');
        return;
      }

      dispatch({ type: 'ADD_ITEM', payload: data });
      toast.success('Item added to cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await removeFromCart(cartItemId);
        return;
      }

      const { error } = await supabase
        .from('cart')
        .update({ quantity })
        .eq('id', cartItemId);

      if (error) {
        console.error('Error updating quantity:', error);
        toast.error('Failed to update quantity');
        return;
      }

      dispatch({ type: 'UPDATE_ITEM', payload: { id: cartItemId, quantity } });
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Failed to update quantity');
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id', cartItemId);

      if (error) {
        console.error('Error removing from cart:', error);
        toast.error('Failed to remove item from cart');
        return;
      }

      dispatch({ type: 'REMOVE_ITEM', payload: cartItemId });
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item from cart');
    }
  };

  const clearCart = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error clearing cart:', error);
        toast.error('Failed to clear cart');
        return;
      }

      dispatch({ type: 'CLEAR_CART' });
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const value: CartContextType = {
    ...state,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
