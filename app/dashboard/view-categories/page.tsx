/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Menu, Plus, Edit, Trash2, Eye, Package } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  icon?: string;
  created_at: string;
}

interface Subcategory {
  id: string;
  name: string;
  category_id: string;
}

const ViewCategoriesPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const router = useRouter();

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        supabase.from("categories").select("*").order("created_at", { ascending: false }),
        supabase.from("subcategories").select("*")
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (subcategoriesRes.error) throw subcategoriesRes.error;

      setCategories(categoriesRes.data || []);
      setSubcategories(subcategoriesRes.data || []);
    } catch (error: any) {
      toast.error(`Failed to fetch categories: ${error.message}`);
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (categoryId: string) => {
    router.push(`/dashboard/add-category?edit=${categoryId}`);
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(categoryId);
      
      // First, delete all subcategories associated with this category
      const { error: subcategoryError } = await supabase
        .from("subcategories")
        .delete()
        .eq("category_id", categoryId);

      if (subcategoryError) throw subcategoryError;

      // Then delete the category
      const { error: categoryError } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (categoryError) throw categoryError;

      toast.success("Category deleted successfully!");
      fetchCategories(); // Refresh the list
    } catch (error: any) {
      toast.error(`Failed to delete category: ${error.message}`);
      console.error("Delete error:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const getSubcategoryCount = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId).length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      View Categories
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Manage your product categories
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/add-category"
                className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors text-sm w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Categories</h2>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{categories.length} categories</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-600">Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <Package className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No categories found</h3>
                <p className="text-sm text-gray-600 mb-4">Get started by creating your first category.</p>
                <Link
                  href="/dashboard/add-category"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
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
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Icon
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subcategories
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
                      {categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {category.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                              {category.icon ? (
                                <span className="text-lg">{category.icon}</span>
                              ) : (
                                <Package className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getSubcategoryCount(category.id)} subcategories
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(category.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(category.id)}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(category.id, category.name)}
                                disabled={deleteLoading === category.id}
                                className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleteLoading === category.id ? (
                                  <div className="w-3 h-3 mr-1 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 className="w-3 h-3 mr-1" />
                                )}
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Card View */}
                <div className="lg:hidden">
                  <div className="divide-y divide-gray-200">
                    {categories.map((category) => (
                      <div key={category.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start space-x-3">
                          {/* Icon */}
                          <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex-shrink-0">
                            {category.icon ? (
                              <span className="text-lg sm:text-xl">{category.icon}</span>
                            ) : (
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                  {category.name}
                                </h3>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-1 space-y-1 sm:space-y-0">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 w-fit">
                                    {getSubcategoryCount(category.id)} subcategories
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    Created {formatDate(category.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                              <button
                                onClick={() => handleEdit(category.id)}
                                className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(category.id, category.name)}
                                disabled={deleteLoading === category.id}
                                className="flex items-center justify-center space-x-1.5 px-3 py-2 border border-red-300 rounded-md text-xs sm:text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {deleteLoading === category.id ? (
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
                    ))}
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

export default ViewCategoriesPage;