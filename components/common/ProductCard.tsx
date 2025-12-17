/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";

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
}

interface ProductCardProps {
  product: Product;
  currency?: string;
}

export const ProductCard = ({ product, currency = "৳" }: ProductCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite, loading } = useFavorites();
  const [isToggling, setIsToggling] = useState(false);
  
  const hasDiscount = product.discount_price && product.discount_price < product.price;
  const discountPercentage = hasDiscount 
    ? Math.round(((product.price - product.discount_price!) / product.price) * 100)
    : 0;

  const isOutOfStock = product.stock === 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock || isAddingToCart) return;
    
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isToggling || loading) return;
    setIsToggling(true);
    try {
      await toggleFavorite(product.id);
    } catch {
      // errors handled in context via toast
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="group relative bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 hover:border-gray-300">
      {/* Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2">
        {hasDiscount && (
          <div className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm w-fit">
            -{discountPercentage}%
          </div>
        )}
        {isOutOfStock && (
          <div className="bg-gray-800 text-white text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm">
            Out of Stock
          </div>
        )}
      </div>

      {/* Wishlist Button */}
      <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handleWishlistToggle}
          aria-label={isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites'}
          disabled={isToggling || loading}
          className={`p-2 rounded-full shadow-md transition-all duration-300 ${
            isFavorite(product.id)
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-600 hover:bg-red-600 hover:text-white'
          } ${isToggling ? 'opacity-80' : ''}`}
        >
          <Heart size={16} className={isFavorite(product.id) ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Product Image - Clickable */}
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative overflow-hidden bg-gray-50">
          <div className="relative w-full h-48">
            <Image
              src={imageError ? '/placeholder-product.jpg' : product.cover_image}
              alt={product.name}
              fill
              className="object-contain group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
            />
          </div>
          
          {/* Out of stock overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        {/* Product Name - Clickable */}
        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer text-sm leading-tight">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={12} className="text-yellow-400 fill-current" />
          ))}
          <span className="text-xs text-gray-500 ml-1">(4.5)</span>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {hasDiscount ? (
              <>
                <span className="text-lg font-bold text-gray-900">
                  {currency}{product.discount_price!.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  {currency}{product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                {currency}{product.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAddingToCart}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
            isOutOfStock || isAddingToCart
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 cursor-pointer'
          }`}
        >
          <ShoppingCart size={16} />
          {isOutOfStock ? 'Out of Stock' : isAddingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};
