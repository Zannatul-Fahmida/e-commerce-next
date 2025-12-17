/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Search, User, Menu, X, User2Icon, LogOut, LayoutDashboard, ShoppingCart, Heart } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase, getUserCached } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import logo from "@/public/assets/logo-3.png";
import Image from "next/image";

interface NavbarProps {
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

interface UserProfile {
  id: string;
  email?: string;
  full_name: string;
  role: 'admin' | 'customer';
}

export function Navbar({ onMenuToggle, isSidebarOpen }: NavbarProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { items } = useCart();
  const { items: favItems } = useFavorites();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user: authUser }, error } = await getUserCached();
        if (authUser && !error) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, role')
            .eq('id', authUser.id)
            .single();
          setUser({
            id: authUser.id,
            email: authUser.email,
            full_name: profile?.full_name || authUser.email?.split('@')[0] || 'User',
            role: profile?.role || 'customer'
          });
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(() => fetchUser());
    } else {
      setTimeout(() => fetchUser(), 0);
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        fetchUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getUserInitial = () => {
    if (!user?.full_name) return 'U';
    const names = user.full_name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Failed to logout');
      } else {
        toast.success('Logged out successfully');
        setUser(null);
        router.push('/');
      }
    } catch (err) {
      toast.error('An error occurred during logout');
      console.error(err);
    }
    setIsUserDropdownOpen(false);
  };

  const handleDashboardClick = () => {
    router.push('/dashboard');
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const closeDropdowns = () => {
    setIsUserDropdownOpen(false);
    setIsMobileMenuOpen(false);
  };

  const getTotalCartItems = () => {
    return items?.reduce((total, item) => total + item.quantity, 0) || 0;
  };

  const getTotalFavorites = () => {
    return favItems?.length || 0;
  };

  const handleSearch = () => {
    const query = searchTerm.trim();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/products');
    }
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 lg:left-64 right-0 z-40 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          {/* Left side - Hamburger menu for mobile */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
            </button>
            
            {/* Logo for mobile */}
            <Link href="/" className="md:hidden" aria-label="Go to home">
              <Image src={logo} alt="Prinon" className="w-auto h-5" />
            </Link>
          </div>

          {/* Search Bar - Hidden on mobile, shown on larger screens */}
          <div className="hidden md:flex flex-1 items-start max-w-2xl mx-4">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search for products"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white placeholder-gray-500"
              />
            </div>
          </div>

          {/* Right Side - Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 2xl:space-x-6">
            {/* Cart Icon */}
            <Link href="/cart" aria-label="Cart" className="relative text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {getTotalCartItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {getTotalCartItems()}
                </span>
              )}
            </Link>

            {/* Favorites Icon */}
            <Link href="/favorites" aria-label="Favorites" className="relative text-gray-700 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Heart className={`w-6 h-6 ${getTotalFavorites() ? 'text-red-600' : ''}`} />
              {getTotalFavorites() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {getTotalFavorites()}
                </span>
              )}
            </Link>
            
            {/* User Authentication Section */}
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="w-10 h-10 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center transition-colors duration-200 font-semibold text-sm"
                >
                  {getUserInitial()}
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <p className="text-xs text-primary-600 font-medium capitalize mt-1">{user.role}</p>
                    </div>
                    <button
                      onClick={handleDashboardClick}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3" />
                      Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="text-gray-700 hover:text-gray-900 flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5" />
                <span className="text-sm font-medium">Login</span>
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-gray-600" /> : <User2Icon className="w-5 h-5 text-gray-600" />}
          </button>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for products"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white placeholder-gray-500"
            />
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden mt-4 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-3">
              
              {/* Mobile Cart Icon */}
              <Link 
                href="/cart" 
                className="relative text-gray-700 hover:text-gray-900 flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={closeDropdowns}
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="text-sm font-medium">Cart</span>
                {getTotalCartItems() > 0 && (
                  <span className="bg-primary-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium ml-auto">
                    {getTotalCartItems()}
                  </span>
                )}
              </Link>

              {/* Mobile Favorites Icon */}
              <Link 
                href="/favorites" 
                className="relative text-gray-700 hover:text-gray-900 flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={closeDropdowns}
              >
                <Heart className="w-5 h-5" />
                <span className="text-sm font-medium">Favorites</span>
                {getTotalFavorites() > 0 && (
                  <span className="bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium ml-auto">
                    {getTotalFavorites()}
                  </span>
                )}
              </Link>
              
              {/* Mobile User Section */}
              {loading ? (
                <div className="flex items-center space-x-2 py-2 px-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              ) : user ? (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex items-center space-x-3 py-2 px-3 mb-2">
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {getUserInitial()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      <p className="text-xs text-primary-600 font-medium capitalize">{user.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleDashboardClick}
                    className="w-full flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                <Link 
                  href="/login" 
                  className="text-gray-700 hover:text-gray-900 flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
                  onClick={closeDropdowns}
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">Login</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Click outside to close dropdowns */}
      {(isUserDropdownOpen || isMobileMenuOpen) && (
        <div 
          className="fixed inset-0 z-30" 
          onClick={closeDropdowns}
        />
      )}
    </>
  );
}
