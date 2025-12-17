/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Menu, Plus, Edit, Trash2, Package, DollarSign, Archive, Eye, PackageX } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description: string;
  summary: string;
  price: number;
  discount_price?: number;
  stock: number;
  subcategory_id: string;
  cover_image: string;
  additional_images: string[];
  options: any;
  created_at: string;
  updated_at: string;
  subcategories?: {
    name: string;
    categories?: {
      name: string;
    };
  };
}

const ViewProductsPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [outOfStockLoading, setOutOfStockLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          subcategories (
            name,
            categories (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch products: ${error.message}`);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (productId: string) => {
    router.push(`/dashboard/add-product?edit=${productId}`);
  };

  const handleView = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(productId);
      
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product deleted successfully!");
      fetchProducts(); // Refresh the list
    } catch (error: any) {
      toast.error(`Failed to delete product: ${error.message}`);
      console.error("Delete error:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleMarkOutOfStock = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to mark "${productName}" as out of stock? This will set the stock to 0.`)) {
      return;
    }

    try {
      setOutOfStockLoading(productId);
      
      const { error } = await supabase
        .from("products")
        .update({ stock: 0 })
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product marked as out of stock!");
      fetchProducts(); // Refresh the list
    } catch (error: any) {
      toast.error(`Failed to mark product as out of stock: ${error.message}`);
      console.error("Out of stock error:", error);
    } finally {
      setOutOfStockLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (stock < 10) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar isOpen={isSidebarOpen} onToggle={handleToggle} />
      <div className="flex-1 flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  onClick={handleToggle}
                  className="lg:hidden p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="p-1.5 sm:p-2 bg-primary-100 rounded-lg">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      View Products
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Manage your product inventory
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/add-product"
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Products</h2>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{products.length} products</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-600">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-sm text-gray-600 mb-4">Get started by adding your first product.</p>
                <Link
                  href="/dashboard/add-product"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </Link>
              </div>
            ) : (
              <>
                {/* Desktop Table View (hidden on mobile) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Discount Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {products.map((product) => {
                        const stockStatus = getStockStatus(product.stock);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img
                                    className="h-10 w-10 rounded-lg object-cover"
                                    src={product.cover_image}
                                    alt={product.name}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = '/placeholder-image.png';
                                    }}
                                  />
                                </div>
                                <div className="ml-4 min-w-0 flex-1">
                                  <div className="text-sm font-medium text-gray-900 truncate max-w-20" title={product.name}>
                                    {product.name}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {product.subcategories?.categories?.name}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {formatPrice(product.price)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.discount_price ? (
                                <div className="text-sm font-medium text-red-600">
                                  {formatPrice(product.discount_price)}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-400">
                                  N/A
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                                {product.stock === 0 ? 'Out of Stock' : `${product.stock} - ${stockStatus.label}`}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(product.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleView(product.id)}
                                  className="inline-flex items-center p-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleEdit(product.id)}
                                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(product.id, product.name)}
                                  disabled={deleteLoading === product.id}
                                  className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deleteLoading === product.id ? (
                                    <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                                {product.stock > 0 && (
                                  <button
                                    onClick={() => handleMarkOutOfStock(product.id, product.name)}
                                    disabled={outOfStockLoading === product.id}
                                    className="inline-flex items-center px-3 py-1 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {outOfStockLoading === product.id ? (
                                      <div className="w-3 h-3 mr-1 border border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <PackageX className="w-3 h-3 mr-1" />
                                    )}
                                    Out of Stock
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Card View */}
                <div className="lg:hidden">
                  <div className="divide-y divide-gray-200">
                    {products.map((product) => {
                      const stockStatus = getStockStatus(product.stock);
                      return (
                        <div key={product.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-3">
                            {/* Product Image */}
                            <div className="flex-shrink-0">
                              <img
                                className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover"
                                src={product.cover_image}
                                alt={product.name}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/placeholder-image.png';
                                }}
                              />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate" title={product.name}>
                                    {product.name}
                                  </h3>
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-1 sm:space-y-0">
                                    <div className="flex items-center space-x-2">
                                      <DollarSign className="w-3 h-3 text-gray-400" />
                                      <span className="text-sm font-medium text-gray-900">
                                        {formatPrice(product.price)}
                                      </span>
                                      {product.discount_price && (
                                        <span className="text-sm text-red-600 font-medium">
                                          {formatPrice(product.discount_price)}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stockStatus.color} w-fit`}>
                                      <Archive className="w-3 h-3 mr-1" />
                                      {product.stock === 0 ? 'Out of Stock' : `${product.stock} - ${stockStatus.label}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-xs text-gray-500">
                                      {product.subcategories?.categories?.name} → {product.subcategories?.name}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    Created {formatDate(product.created_at)}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                <button
                                  onClick={() => handleView(product.id)}
                                  className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-blue-300 rounded-md text-xs sm:text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleEdit(product.id)}
                                  className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                {product.stock > 0 && (
                                  <button
                                    onClick={() => handleMarkOutOfStock(product.id, product.name)}
                                    disabled={outOfStockLoading === product.id}
                                    className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-orange-300 rounded-md text-xs sm:text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {outOfStockLoading === product.id ? (
                                      <div className="w-3 h-3 border border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <PackageX className="w-3 h-3" />
                                    )}
                                    <span>Out of Stock</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(product.id, product.name)}
                                  disabled={deleteLoading === product.id}
                                  className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-red-300 rounded-md text-xs sm:text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deleteLoading === product.id ? (
                                    <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProductsPage;