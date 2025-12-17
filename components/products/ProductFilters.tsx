"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, Filter } from "lucide-react";

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

interface ProductFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (categoryId: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (subcategoryId: string) => void;
  selectedTags: string[];
  setSelectedTags: (tagIds: string[]) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  categories: Category[];
  subcategories: Subcategory[];
  tags: Tag[];
  onClearFilters: () => void;
}

export function ProductFilters({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategory,
  setSelectedSubcategory,
  selectedTags,
  setSelectedTags,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  categories,
  subcategories,
  tags,
  onClearFilters,
}: ProductFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  // Get filtered subcategories based on selected category
  const getFilteredSubcategories = () => {
    if (!selectedCategory) return subcategories;
    return subcategories.filter(sub => sub.category_id === selectedCategory);
  };

  // Check if any filters are active (including search and tags)
  const hasActiveFilters = searchQuery || selectedCategory || selectedSubcategory || selectedTags.length > 0 || priceRange.min || priceRange.max;

  // Handle price range changes
  const handleMinPriceChange = (value: string) => {
    setPriceRange({ min: value, max: priceRange.max });
  };

  const handleMaxPriceChange = (value: string) => {
    setPriceRange({ min: priceRange.min, max: value });
  };

  // Handle tag selection
  const handleTagToggle = (tagId: string) => {
    // Only allow tag selection if subcategory is selected
    if (!selectedSubcategory) return;
    
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(id => id !== tagId));
    } else {
      setSelectedTags([...selectedTags, tagId]);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header with Search and Filter Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">Search & Filters</h3>
        </div>
        
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => {
                onClearFilters();
                setSearchQuery("");
                setSelectedTags([]);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Content */}
      <div className="p-4">
        {/* Search Bar with Filter Toggle - First Row */}
        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center px-3 py-2.5 border rounded-md transition-colors ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100' 
                  : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
              }`}
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Options - Second Row */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory("");
                  // Clear tags when category changes
                  setSelectedTags([]);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subcategory
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => {
                  setSelectedSubcategory(e.target.value);
                  // Clear tags when subcategory changes
                  setSelectedTags([]);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 text-sm"
                disabled={!selectedCategory}
              >
                <option value="">All Subcategories</option>
                {getFilteredSubcategories().map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="relative">
                <select
                  onChange={(e) => {
                    if (e.target.value && !selectedTags.includes(e.target.value) && selectedSubcategory) {
                      handleTagToggle(e.target.value);
                    }
                    e.target.value = ""; // Reset select
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-400 text-sm"
                  value=""
                  disabled={!selectedSubcategory}
                >
                  <option value="">
                    {!selectedSubcategory ? "Select subcategory first..." : "Select Tags..."}
                  </option>
                  {tags.map((tag) => (
                    <option 
                      key={tag.id} 
                      value={tag.id}
                      disabled={selectedTags.includes(tag.id)}
                    >
                      {tag.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price Range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange.min}
                  onChange={(e) => handleMinPriceChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
                <span className="flex items-center text-gray-400 px-1">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange.max}
                  onChange={(e) => handleMaxPriceChange(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                />
              </div>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white text-sm"
              >
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>
          </div>
        )}

        {/* Selected Tags Display */}
        {showFilters && selectedTags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected Tags:
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tagId) => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <span
                    key={tagId}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full"
                  >
                    {tag.name}
                    <button
                      onClick={() => handleTagToggle(tagId)}
                      className="hover:text-teal-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                  Search: &quot;{searchQuery}&quot;
                  <button
                    onClick={() => setSearchQuery("")}
                    className="hover:text-gray-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => {
                      setSelectedCategory("");
                      // Clear tags when category is cleared
                      setSelectedTags([]);
                    }}
                    className="hover:text-blue-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedSubcategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                  {subcategories.find(s => s.id === selectedSubcategory)?.name}
                  <button
                    onClick={() => {
                      setSelectedSubcategory("");
                      // Clear tags when subcategory is cleared
                      setSelectedTags([]);
                    }}
                    className="hover:text-green-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedTags.length > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 text-sm rounded-full">
                  {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                  <button
                    onClick={() => setSelectedTags([])}
                    className="hover:text-teal-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                  ${priceRange.min || '0'} - ${priceRange.max || '∞'}
                  <button
                    onClick={() => setPriceRange({ min: "", max: "" })}
                    className="hover:text-purple-900"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}