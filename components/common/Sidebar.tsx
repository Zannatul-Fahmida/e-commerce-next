/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight, X, Package } from "lucide-react";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current URL parameters
  const currentCategory = searchParams.get('category');
  const currentSubcategory = searchParams.get('subcategory');

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, subcategoriesRes] = await Promise.all([
          supabase.from("categories").select("id, name, icon"),
          supabase.from("subcategories").select("id, name, category_id"),
        ]);
        
        if (categoriesRes.error) {
          console.error("Error fetching categories:", categoriesRes.error);
        } else {
          setCategories(categoriesRes.data || []);
        }
        
        if (subcategoriesRes.error) {
          console.error("Error fetching subcategories:", subcategoriesRes.error);
        } else {
          setSubcategories(subcategoriesRes.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => fetchData());
    } else {
      setTimeout(() => fetchData(), 0);
    }
  }, []);

  // Auto-expand category if it's selected via URL params
  useEffect(() => {
    if (currentCategory) {
      // Find category by slug and expand it
      const category = categories.find(cat => getSlug(cat.name) === currentCategory);
      if (category && !openCategories.includes(category.id)) {
        setOpenCategories(prev => [...prev, category.id]);
      }
    }
  }, [currentCategory, categories, openCategories]);

  // Toggle category dropdown
  const toggleCategory = (categoryId: string) => {
    setOpenCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  // Generate slug from name
  const getSlug = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/&/g, "and");
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen overflow-y-auto bg-white z-50
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 w-64 border-r border-gray-200 flex flex-col
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link href="/" className="flex items-center justify-center" onClick={onClose}>
            <Image
              src="/assets/logo-2.png"
              alt="Prinon"
              width={70}
              height={70}
              className="object-contain"
            />
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-4">
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <nav>
              {/* Categories */}
              {categories.map((category) => (
                <div key={category.id} className="mb-2">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between py-2 px-3 text-left text-gray-700 hover:bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      {category.icon && (
                        <span className="text-lg flex-shrink-0">{category.icon}</span>
                      )}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    {openCategories.includes(category.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  
                  {openCategories.includes(category.id) && (
                    <div className="ml-4 mt-1 space-y-1">
                      {subcategories
                        .filter((sub) => sub.category_id === category.id)
                        .map((sub) => (
                          <Link
                            key={sub.id}
                            href={`/products?category=${getSlug(category.name)}&subcategory=${getSlug(sub.name)}`}
                            className={`block p-2 text-sm rounded ${
                              pathname === `/products` && 
                              currentCategory === getSlug(category.name) &&
                              currentSubcategory === getSlug(sub.name)
                                ? "bg-primary-100 text-primary-700"
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                            onClick={onClose}
                          >
                            {sub.name}
                          </Link>
                        ))}
                      
                      <Link
                        href={`/products?category=${getSlug(category.name)}`}
                        className={`block p-2 text-sm rounded ${
                          pathname === `/products` && 
                          currentCategory === getSlug(category.name) && 
                          !currentSubcategory
                            ? "bg-primary-100 text-primary-700"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                        onClick={onClose}
                      >
                        All {category.name}
                      </Link>
                    </div>
                  )}
                </div>
              ))}
              {/* All Products Link */}
              <div className="mb-4">
                <Link
                  href="/products"
                  className={`w-full flex items-center gap-3 py-2 px-3 text-left rounded ${
                    pathname === "/products" && !currentCategory
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onClick={onClose}
                >
                  <Package className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">All Products</span>
                </Link>
              </div>

            </nav>
          )}
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-200 p-4">
          <p className="text-xs text-gray-500 text-center">
            © {currentYear} Prinon. All rights reserved.
          </p>
        </div>
      </aside>
    </>
  );
}
