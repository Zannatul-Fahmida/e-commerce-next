/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { ProductCard } from "../common/ProductCard";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  price: number;
  discount_price?: number;
  stock: number;
  cover_image: string;
  additional_images?: string[];
  options?: any[];
  product_type?: string;
  created_at?: string;
}

type TabType = "featured" | "best_sellers" | "new_arrivals";

// Loading skeleton component for product cards
function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="w-full h-48 bg-gray-200"></div>
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        
        {/* Rating skeleton */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-3 h-3 bg-gray-200 rounded"></div>
          ))}
          <div className="h-3 bg-gray-200 rounded w-8 ml-1"></div>
        </div>
        
        {/* Price skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-5 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </div>
        
        {/* Button skeleton */}
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    </div>
  );
}

const DailyDeals = () => {
  const [activeTab, setActiveTab] = useState<TabType>("featured");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "featured" as TabType, label: "Featured", dbValue: "featured" },
    { id: "best_sellers" as TabType, label: "Best Sellers", dbValue: "best_deals" },
    { id: "new_arrivals" as TabType, label: "New Arrivals", dbValue: null },
  ];

  const fetchProducts = async (tabType: TabType) => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("id, name, price, discount_price, cover_image, stock, product_type, created_at")
        .limit(8);

      if (tabType === "new_arrivals") {
        // For new arrivals, order by created_at descending (newest first)
        query = query.order("created_at", { ascending: false });
      } else {
        // For featured and best sellers, filter by product_type
        const dbValue = tabs.find(tab => tab.id === tabType)?.dbValue;
        if (dbValue) {
          query = query.eq("product_type", dbValue);
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = () => fetchProducts(activeTab);
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(run);
    } else {
      setTimeout(run, 0);
    }
  }, [activeTab]);

  const getTabDisplayName = (tabType: TabType) => {
    switch (tabType) {
      case "featured":
        return "Featured";
      case "best_sellers":
        return "Best Sellers";
      case "new_arrivals":
        return "New Arrivals";
      default:
        return "Products";
    }
  };

  return (
    <section className="py-10 md:py-12">
      <div className="container mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-5xl font-bold text-primary-800 mb-6">
            DAILY DEALS!
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex justify-center items-center gap-8 mb-8 md:mb-12">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`md:text-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                  activeTab === tab.id
                    ? "text-primary-800 border-b-2 border-primary-800 pb-1"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <>
            {/* Loading skeleton grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {[...Array(16)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
            
            {/* Button skeleton */}
            <div className="flex justify-center">
              <div className="h-12 bg-gray-200 rounded-md w-48 animate-pulse"></div>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Show All Button */}
            {products.length > 0 && (
              <div className="flex justify-center">
                <Link href={`/products`}>
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="px-8 py-3 text-base font-medium border-2 border-primary-800 text-primary-800 hover:bg-primary-800 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    Show All Products
                  </Button>
                </Link>
              </div>
            )}

            {/* Empty State */}
            {!loading && products.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-500 text-lg">
                  No {getTabDisplayName(activeTab).toLowerCase()} products available at the moment.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default DailyDeals;
