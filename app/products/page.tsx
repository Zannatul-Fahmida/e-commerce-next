"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ProductCard } from "@/components/common/ProductCard";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { ProductFilters } from "@/components/products/ProductFilters";

interface Product {
  id: string;
  name: string;
  price: number;
  discount_price?: number;
  cover_image: string;
  subcategory_id?: string;
  stock: number; 
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

interface Tag {
  id: string;
  name: string;
}

interface SubcategoryTag {
  subcategory_id: string;
  tag_id: string;
}

// Loading skeleton component
function ProductsPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="w-64 bg-white shadow-lg animate-pulse"></div>
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <div className="h-16 bg-white shadow-sm animate-pulse"></div>
        <main className="p-4 sm:p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          
          {/* Filters Skeleton */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="h-12 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Products Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-80 animate-pulse shadow-sm"></div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

// Content component that uses useSearchParams
function ProductsPageContent() {
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subcategoryTags, setSubcategoryTags] = useState<SubcategoryTag[]>([]);
  const [productTags, setProductTags] = useState<{[productId: string]: string[]}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // Convert slug back to name
  const getNameFromSlug = (slug: string) => {
    return slug
      .split("-")
      .map((word) => word === "and" ? "&" : word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  useEffect(() => {
    const q = searchParams.get('search');
    setSearchQuery(q || "");
  }, [searchParams]);

  // Get tags filtered by selected subcategory
  const getFilteredTags = () => {
    if (!selectedSubcategory) return [];
    
    const tagIdsForSubcategory = subcategoryTags
      .filter(st => st.subcategory_id === selectedSubcategory)
      .map(st => st.tag_id);
    
    return tags.filter(tag => tagIdsForSubcategory.includes(tag.id));
  };

  // Handle URL parameters - convert slugs to IDs
  useEffect(() => {
    if (categories.length === 0 || subcategories.length === 0) return;

    const categorySlug = searchParams.get('category');
    const subcategorySlug = searchParams.get('subcategory');
    
    if (categorySlug) {
      const categoryName = getNameFromSlug(categorySlug);
      const category = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
      if (category) {
        setSelectedCategory(category.id);
      }
    } else {
      setSelectedCategory("");
    }
    
    if (subcategorySlug) {
      const subcategoryName = getNameFromSlug(subcategorySlug);
      const subcategory = subcategories.find(sub => sub.name.toLowerCase() === subcategoryName.toLowerCase());
      if (subcategory) {
        setSelectedSubcategory(subcategory.id);
        // Clear tags when subcategory is set from URL
        setSelectedTags([]);
      }
    } else {
      setSelectedSubcategory("");
      // Clear tags when subcategory is cleared
      setSelectedTags([]);
    }
  }, [searchParams, categories, subcategories]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products with simple query
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, name, price, discount_price, cover_image, subcategory_id, stock")
          .order("created_at", { ascending: false });

        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("id, name");

        // Fetch subcategories
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from("subcategories")
          .select("id, name, category_id");

        // Fetch tags
        const { data: tagsData, error: tagsError } = await supabase
          .from("tags")
          .select("id, name")
          .order("name");

        // Fetch subcategory-tag relationships
        const { data: subcategoryTagsData, error: subcategoryTagsError } = await supabase
          .from("subcategory_tags")
          .select("subcategory_id, tag_id");

        // Fetch product-tag relationships
        const { data: productTagsData, error: productTagsError } = await supabase
          .from("product_tags")
          .select("product_id, tag_id");

        if (productsError) {
          console.error("Error fetching products:", productsError);
          setError("Failed to load products");
        } else {
          setProducts(productsData || []);
          setFilteredProducts(productsData || []);
        }

        if (categoriesError) {
          console.error("Error fetching categories:", categoriesError);
        } else {
          setCategories(categoriesData || []);
        }

        if (subcategoriesError) {
          console.error("Error fetching subcategories:", subcategoriesError);
        } else {
          setSubcategories(subcategoriesData || []);
        }

        if (tagsError) {
          console.error("Error fetching tags:", tagsError);
        } else {
          setTags(tagsData || []);
        }

        if (subcategoryTagsError) {
          console.error("Error fetching subcategory tags:", subcategoryTagsError);
        } else {
          setSubcategoryTags(subcategoryTagsData || []);
        }

        if (productTagsError) {
          console.error("Error fetching product tags:", productTagsError);
        } else {
          // Create a mapping of product ID to tag IDs
          const productTagMap: {[productId: string]: string[]} = {};
          productTagsData?.forEach(pt => {
            if (!productTagMap[pt.product_id]) {
              productTagMap[pt.product_id] = [];
            }
            productTagMap[pt.product_id].push(pt.tag_id);
          });
          setProductTags(productTagMap);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and search logic
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => {
        const subcategory = subcategories.find(sub => sub.id === product.subcategory_id);
        return subcategory?.category_id === selectedCategory;
      });
    }

    // Subcategory filter
    if (selectedSubcategory) {
      filtered = filtered.filter(product => product.subcategory_id === selectedSubcategory);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(product => {
        const productTagIds = productTags[product.id] || [];
        // Check if product has ANY of the selected tags (OR logic)
        return selectedTags.some(tagId => productTagIds.includes(tagId));
      });
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const price = product.discount_price || product.price;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
        break;
      case "price-high":
        filtered.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
        break;
      case "name":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default: // newest
        // Already sorted by created_at in the query
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, selectedSubcategory, selectedTags, priceRange, sortBy, subcategories, productTags]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedSubcategory("");
    setSelectedTags([]);
    setPriceRange({ min: "", max: "" });
    setSortBy("newest");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
          <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="p-4 sm:p-6 space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-3">
              <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            
            {/* Filters Skeleton */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="h-12 bg-gray-200 rounded-lg animate-pulse mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Products Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl h-80 animate-pulse shadow-sm"></div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
          <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <main className="p-4 sm:p-6">
            <div className="text-center py-12">
              <div className="bg-white rounded-xl p-8 shadow-sm max-w-md mx-auto">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h1>
                <p className="text-red-600 mb-6">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Discover Our Products
            </h1>
            <p className="text-lg text-gray-600">
              Explore our complete collection of amazing products
            </p>
          </div>

          {/* Filters Component */}
          <ProductFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedSubcategory={selectedSubcategory}
            setSelectedSubcategory={setSelectedSubcategory}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            priceRange={priceRange}
            setPriceRange={setPriceRange}
            sortBy={sortBy}
            setSortBy={setSortBy}
            categories={categories}
            subcategories={subcategories}
            tags={getFilteredTags()}
            onClearFilters={clearFilters}
          />

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-4 w-full">
              <div className="bg-white rounded-xl p-12 shadow-sm mx-auto">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-10 h-10 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4m-4 0H9m-4 0h4m0 0V9a2 2 0 012-2h2a2 2 0 012 2v4.01"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">No products found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || selectedCategory || selectedSubcategory || selectedTags.length > 0 || priceRange.min || priceRange.max
                    ? "We couldn't find any products matching your current filters. Try adjusting your search criteria."
                    : "There are no products available at the moment. Please check back later."}
                </p>
                {(searchQuery || selectedCategory || selectedSubcategory || selectedTags.length > 0 || priceRange.min || priceRange.max) && (
                  <button
                    onClick={clearFilters}
                    className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Main component with Suspense boundary
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsPageSkeleton />}>
      <ProductsPageContent />
    </Suspense>
  );
}