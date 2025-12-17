"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase, getUserCached } from "@/lib/supabase";
import { toast } from "sonner";

type FavoritesContextType = {
  items: string[];
  loading: boolean;
  addFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const LOCAL_KEY = "favorites:product_ids";

const readLocal = (): string[] => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_KEY) : null;
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
};

const writeLocal = (ids: string[]) => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(Array.from(new Set(ids))));
    }
  } catch {
    // ignore
  }
};

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await getUserCached();
      if (!user) {
        setItems(readLocal());
        return;
      }
      await refreshFavorites();
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => init());
    } else {
      setTimeout(() => init(), 0);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setItems(readLocal());
      } else if (event === "SIGNED_IN" && session?.user) {
        // merge local favorites into server
        const local = readLocal();
        if (local.length) {
          try {
            const inserts = local.map((pid) => ({ user_id: session.user.id, product_id: pid }));
            const { error } = await supabase.from("favorites").insert(inserts, { count: "exact" });
            if (!error) {
              writeLocal([]);
            }
          } catch {
            // ignore merging errors; keep local entries
          }
        }
        await refreshFavorites();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshFavorites = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await getUserCached();
      if (!user) {
        setItems(readLocal());
        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) {
        const msg = (error as any)?.message || "Unknown error";
        const normalized = String(msg).toLowerCase();
        const isMissingTable = normalized.includes("relation") || normalized.includes("not exist") || normalized.includes("not found");
        const isRlsDenied = normalized.includes("policy") || normalized.includes("permission") || normalized.includes("denied");
        if (isMissingTable || isRlsDenied) {
          console.info("Favorites not configured on server; falling back to local.");
        } else {
          console.error("Error loading favorites:", msg);
          toast.error("Failed to load favorites");
        }
        setItems(readLocal());
        return;
      }

      const ids = (data || []).map((row: { product_id: string }) => row.product_id);
      setItems(Array.from(new Set(ids)));
    } catch (e) {
      console.error("Error refreshing favorites:", e);
      toast.error("Failed to refresh favorites");
      setItems(readLocal());
    } finally {
      setLoading(false);
    }
  };

  const addFavorite = async (productId: string) => {
    const { data: { user } } = await getUserCached();
    if (!user) {
      const next = Array.from(new Set([...items, productId]));
      setItems(next);
      writeLocal(next);
      toast.success("Added to favorites");
      return;
    }
    try {
      const { error } = await supabase.from("favorites").insert({ user_id: user.id, product_id: productId });
      if (error) {
        throw error;
      }
      const next = Array.from(new Set([...items, productId]));
      setItems(next);
      // Mirror local storage for consistency when signed in
      writeLocal(next);
      toast.success("Added to favorites");
    } catch (e) {
      console.error("Error adding favorite:", e);
      toast.error("Failed to add favorite");
    }
  };

  const removeFavorite = async (productId: string) => {
    const { data: { user } } = await getUserCached();
    if (!user) {
      const next = items.filter((id) => id !== productId);
      setItems(next);
      writeLocal(next);
      toast.success("Removed from favorites");
      return;
    }
    try {
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
      if (error) {
        throw error;
      }
      const next = items.filter((id) => id !== productId);
      setItems(next);
      // Ensure local storage stays in sync even for signed-in users
      writeLocal(next);
      toast.success("Removed from favorites");
    } catch (e) {
      console.error("Error removing favorite:", e);
      toast.error("Failed to remove favorite");
    }
  };

  const toggleFavorite = async (productId: string) => {
    if (items.includes(productId)) {
      await removeFavorite(productId);
    } else {
      await addFavorite(productId);
    }
  };

  const isFavorite = useMemo(() => (productId: string) => items.includes(productId), [items]);

  const value: FavoritesContextType = {
    items,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refreshFavorites,
  };

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
};
