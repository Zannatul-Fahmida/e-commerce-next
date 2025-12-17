/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SidebarWrapper } from "@/components/common/SidebarWrapper";
import { Navbar } from "@/components/common/Navbar";
import { useFavorites } from "@/contexts/FavoritesContext";
import { ProductCard } from "@/components/common/ProductCard";

const FavoritesPage = () => {
  const { items: favoriteIds, loading } = useFavorites();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!favoriteIds || favoriteIds.length === 0) {
        setProducts([]);
        return;
      }
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, name, price, discount_price, stock, cover_image, summary")
          .in("id", favoriteIds);
        if (error) {
          console.error("Error fetching favorite products:", error);
          setProducts([]);
          return;
        }
        setProducts(data || []);
      } catch (e) {
        console.error("Error fetching favorite products:", e);
        setProducts([]);
      } finally {
        setFetching(false);
      }
    };
    fetchProducts();
  }, [favoriteIds]);

  if (loading || fetching) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
        <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
          <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your favorites...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Favorites
              </h1>
              {favoriteIds.length === 0 && (
                <div className="text-gray-600">No favorites yet. Browse products and add some!</div>
              )}
              {products.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default FavoritesPage;