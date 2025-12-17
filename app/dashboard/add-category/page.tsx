/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { Menu, Plus, Tag, Folder, X, ArrowLeft, Save, Edit, Trash2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Common icon options for categories
const ICON_OPTIONS = [
  { name: 'Baby', value: '👶' },
  { name: 'Toys', value: '🧸' },
  { name: 'Clothes', value: '👕' },
  { name: 'Food', value: '🍼' },
  { name: 'Books', value: '📚' },
  { name: 'Health', value: '🏥' },
  { name: 'Bath', value: '🛁' },
  { name: 'Sleep', value: '😴' },
  { name: 'Travel', value: '🚗' },
  { name: 'Safety', value: '🛡️' },
  { name: 'Education', value: '🎓' },
  { name: 'Sports', value: '⚽' },
];

interface SubcategoryWithTags {
  id: string;
  name: string;
  category_id: string;
  tags: string[];
  isEditing?: boolean;
  tempName?: string;
  tempTags?: string[];
}

// Separate component for handling search params
const EditModeHandler = ({ 
  categories, 
  subcategories,
  setIsEditMode, 
  setEditingCategoryId, 
  setNewCategory, 
  setCategoryIcon, 
  setSelectedCategory,
  setSubcategoriesWithTags
}: {
  categories: { id: string; name: string; icon?: string }[];
  subcategories: { id: string; name: string; category_id: string }[];
  setIsEditMode: (value: boolean) => void;
  setEditingCategoryId: (value: string | null) => void;
  setNewCategory: (value: string) => void;
  setCategoryIcon: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setSubcategoriesWithTags: (value: SubcategoryWithTags[]) => void;
}) => {
  const searchParams = useSearchParams();

  const loadCategoryForEdit = async (categoryId: string) => {
    try {
      const category = categories.find(c => c.id === categoryId);
      if (category) {
        setNewCategory(category.name);
        setCategoryIcon(category.icon || "");
        setSelectedCategory(categoryId);

        // Load subcategories and their tags for this category
        const categorySubcategories = subcategories.filter(sub => sub.category_id === categoryId);
        
        const subcategoriesWithTags: SubcategoryWithTags[] = [];
        
        for (const subcategory of categorySubcategories) {
          const { data: subcategoryTags } = await supabase
            .from("subcategory_tags")
            .select("tags(name)")
            .eq("subcategory_id", subcategory.id);

          const tagNames = subcategoryTags ? subcategoryTags.map((st: any) => st.tags.name) : [];
          
          subcategoriesWithTags.push({
            ...subcategory,
            tags: tagNames
          });
        }
        
        setSubcategoriesWithTags(subcategoriesWithTags);
      }
    } catch (error) {
      console.error("Error loading category for edit:", error);
    }
  };

  // Handle edit mode
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditMode(true);
      setEditingCategoryId(editId);
      loadCategoryForEdit(editId);
    }
  }, [searchParams, categories, subcategories]);

  return null; // This component doesn't render anything
};

const AddCategoryPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; icon?: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [newCategory, setNewCategory] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("");
  const [subcategoriesWithTags, setSubcategoriesWithTags] = useState<SubcategoryWithTags[]>([]);
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newSubcategoryTags, setNewSubcategoryTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const router = useRouter();

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesRes, subcategoriesRes, tagsRes] = await Promise.all([
        supabase.from("categories").select("id, name, icon"),
        supabase.from("subcategories").select("id, name, category_id"),
        supabase.from("tags").select("id, name"),
      ]);
      if (categoriesRes.error) console.error("Error fetching categories:", categoriesRes.error);
      else setCategories(categoriesRes.data);
      if (subcategoriesRes.error) console.error("Error fetching subcategories:", subcategoriesRes.error);
      else setSubcategories(subcategoriesRes.data);
      if (tagsRes.error) console.error("Error fetching tags:", tagsRes.error);
      else setTags(tagsRes.data);
    };
    fetchData();
  }, []);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault();
      const newTags = newTag.split(",").map(tag => tag.trim()).filter(tag => tag && !newSubcategoryTags.includes(tag));
      if (newTags.length > 0) {
        setNewSubcategoryTags([...newSubcategoryTags, ...newTags]);
        setNewTag("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewSubcategoryTags(newSubcategoryTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddSubcategory = () => {
    if (newSubcategory.trim()) {
      const newSub: SubcategoryWithTags = {
        id: `temp-${Date.now()}`,
        name: newSubcategory.trim(),
        category_id: selectedCategory || 'new',
        tags: [...newSubcategoryTags]
      };
      setSubcategoriesWithTags([...subcategoriesWithTags, newSub]);
      setNewSubcategory("");
      setNewSubcategoryTags([]);
    }
  };

  const handleEditSubcategory = (index: number) => {
    const updated = [...subcategoriesWithTags];
    updated[index] = {
      ...updated[index],
      isEditing: true,
      tempName: updated[index].name,
      tempTags: [...updated[index].tags]
    };
    setSubcategoriesWithTags(updated);
  };

  const handleSaveSubcategory = (index: number) => {
    const updated = [...subcategoriesWithTags];
    updated[index] = {
      ...updated[index],
      name: updated[index].tempName || updated[index].name,
      tags: updated[index].tempTags || updated[index].tags,
      isEditing: false,
      tempName: undefined,
      tempTags: undefined
    };
    setSubcategoriesWithTags(updated);
  };

  const handleCancelEditSubcategory = (index: number) => {
    const updated = [...subcategoriesWithTags];
    updated[index] = {
      ...updated[index],
      isEditing: false,
      tempName: undefined,
      tempTags: undefined
    };
    setSubcategoriesWithTags(updated);
  };

  const handleDeleteSubcategory = (index: number) => {
    const updated = subcategoriesWithTags.filter((_, i) => i !== index);
    setSubcategoriesWithTags(updated);
  };

  const handleSubcategoryTagAdd = (index: number, tag: string) => {
    const updated = [...subcategoriesWithTags];
    const currentTags = updated[index].tempTags || updated[index].tags;
    if (!currentTags.includes(tag.trim()) && tag.trim()) {
      updated[index] = {
        ...updated[index],
        tempTags: [...currentTags, tag.trim()]
      };
      setSubcategoriesWithTags(updated);
    }
  };

  const handleSubcategoryTagRemove = (index: number, tagToRemove: string) => {
    const updated = [...subcategoriesWithTags];
    const currentTags = updated[index].tempTags || updated[index].tags;
    updated[index] = {
      ...updated[index],
      tempTags: currentTags.filter(tag => tag !== tagToRemove)
    };
    setSubcategoriesWithTags(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) {
      toast.error("Category name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      let categoryData;
      
      if (isEditMode && editingCategoryId) {
        // Update existing category
        const { data, error } = await supabase
          .from("categories")
          .update({ 
            name: newCategory.trim(),
            icon: categoryIcon || null
          })
          .eq("id", editingCategoryId)
          .select()
          .single();
        
        if (error) throw error;
        categoryData = data;

        // Delete existing subcategories and their tags
        const existingSubcategories = subcategories.filter(sub => sub.category_id === editingCategoryId);
        for (const sub of existingSubcategories) {
          await supabase.from("subcategory_tags").delete().eq("subcategory_id", sub.id);
        }
        await supabase.from("subcategories").delete().eq("category_id", editingCategoryId);
        
      } else {
        // Create new category
        const { data, error } = await supabase
          .from("categories")
          .insert({ 
            name: newCategory.trim(),
            icon: categoryIcon || null
          })
          .select()
          .single();
        
        if (error) throw error;
        categoryData = data;
      }

      // Create/recreate subcategories and tags
      for (const subcategoryData of subcategoriesWithTags) {
        // Create subcategory
        const { data: newSubcategoryData, error: subcategoryError } = await supabase
          .from("subcategories")
          .insert({
            category_id: categoryData.id,
            name: subcategoryData.name,
          })
          .select()
          .single();

        if (subcategoryError) throw subcategoryError;

        // Create tags and associations
        for (const tagName of subcategoryData.tags) {
          let tagId;
          
          // Check if tag exists
          const { data: existingTag } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .single();

          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new tag
            const { data: newTagData, error: tagError } = await supabase
              .from("tags")
              .insert({ name: tagName })
              .select()
              .single();
            
            if (tagError) throw tagError;
            tagId = newTagData.id;
          }

          // Create subcategory-tag association
          await supabase
            .from("subcategory_tags")
            .insert({
              subcategory_id: newSubcategoryData.id,
              tag_id: tagId,
            });
        }
      }

      toast.success(isEditMode ? "Category updated successfully!" : "Category added successfully!");
      router.push("/dashboard/view-categories");
      
    } catch (error: any) {
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} category: ${error.message}`);
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Wrap the EditModeHandler in Suspense */}
      <Suspense fallback={null}>
        <EditModeHandler
          categories={categories}
          subcategories={subcategories}
          setIsEditMode={setIsEditMode}
          setEditingCategoryId={setEditingCategoryId}
          setNewCategory={setNewCategory}
          setCategoryIcon={setCategoryIcon}
          setSelectedCategory={setSelectedCategory}
          setSubcategoriesWithTags={setSubcategoriesWithTags}
        />
      </Suspense>
      
      <DashboardSidebar isOpen={isSidebarOpen} onToggle={handleToggle} />
      <div className="flex-1 flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleToggle}
                  className="lg:hidden p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center space-x-3">
                    <Link
                      href="/dashboard/view-categories"
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {isEditMode ? 'Edit Category' : 'Add Category'}
                    </h1>
                  </div>
                  <p className="text-gray-600 mt-1 ml-11">
                    {isEditMode ? 'Update category and manage subcategories' : 'Create and organize your product categories'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Category Information */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Category Information</h2>
                <p className="text-sm text-gray-600 mt-1">Basic category details</p>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-6">
                    {/* Category Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Folder className="w-4 h-4" />
                          <span>Category Name</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Enter category name"
                        required
                      />
                    </div>

                    {/* Category Selection for Non-Edit Mode */}
                    {!isEditMode && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <span className="flex items-center space-x-2">
                            <Tag className="w-4 h-4" />
                            <span>Or Select Existing Category</span>
                          </span>
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            const categoryId = e.target.value;
                            setSelectedCategory(categoryId);
                            if (categoryId) {
                              const category = categories.find(c => c.id === categoryId);
                              if (category) {
                                setNewCategory(category.name);
                                setCategoryIcon(category.icon || "");
                              }
                            } else {
                              setNewCategory("");
                              setCategoryIcon("");
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        >
                          <option value="">Create new category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Icon Selection */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Icon
                      </label>
                      
                      {/* Custom Icon Input */}
                      <input
                        type="text"
                        value={categoryIcon}
                        onChange={(e) => setCategoryIcon(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors mb-4"
                        placeholder="Enter emoji or custom icon"
                      />

                      {/* Icon Preview */}
                      {categoryIcon && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700">Preview:</span>
                            <div className="flex items-center justify-center w-10 h-10 bg-white rounded-md border border-gray-200">
                              <span className="text-xl">{categoryIcon}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Predefined Icons */}
                      <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700">Quick Select:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {ICON_OPTIONS.map((icon) => (
                            <button
                              key={icon.name}
                              type="button"
                              onClick={() => setCategoryIcon(icon.value)}
                              className={`p-2 border rounded-md text-center hover:bg-gray-50 transition-colors ${
                                categoryIcon === icon.value 
                                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200' 
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              title={icon.name}
                            >
                              <div className="text-lg mb-1">{icon.value}</div>
                              <div className="text-xs text-gray-600">{icon.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Subcategories Management */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Subcategories & Tags</h2>
                <p className="text-sm text-gray-600 mt-1">Manage subcategories and their associated tags</p>
              </div>

              <div className="p-6">
                {/* Add New Subcategory */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Subcategory</h3>
                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={newSubcategory}
                        onChange={(e) => setNewSubcategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Enter subcategory name"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={handleAddTag}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Enter tags separated by commas (Press Enter to add)"
                        list="tag-suggestions"
                        autoComplete="off"
                      />
                      <datalist id="tag-suggestions">
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.name} />
                        ))}
                      </datalist>
                      {newSubcategoryTags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {newSubcategoryTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
                            >
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="ml-2 text-primary-600 hover:text-primary-800 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSubcategory}
                      disabled={!newSubcategory.trim()}
                      className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Subcategory</span>
                    </button>
                  </div>
                </div>

                {/* Existing Subcategories */}
                {subcategoriesWithTags.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900">Subcategories</h3>
                    {subcategoriesWithTags.map((subcategory, index) => (
                      <div key={subcategory.id} className="p-4 border border-gray-200 rounded-lg">
                        {subcategory.isEditing ? (
                          <div className="space-y-4">
                            <input
                              type="text"
                              value={subcategory.tempName || subcategory.name}
                              onChange={(e) => {
                                const updated = [...subcategoriesWithTags];
                                updated[index] = { ...updated[index], tempName: e.target.value };
                                setSubcategoriesWithTags(updated);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            />
                            <div>
                              <input
                                type="text"
                                placeholder="Add tags (press Enter)"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    e.preventDefault();
                                    handleSubcategoryTagAdd(index, e.currentTarget.value.trim());
                                    e.currentTarget.value = '';
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                              />
                              {(subcategory.tempTags || subcategory.tags).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {(subcategory.tempTags || subcategory.tags).map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200"
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => handleSubcategoryTagRemove(index, tag)}
                                        className="ml-2 text-primary-600 hover:text-primary-800 transition-colors"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                type="button"
                                onClick={() => handleSaveSubcategory(index)}
                                className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelEditSubcategory(index)}
                                className="px-3 py-1 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{subcategory.name}</h4>
                              {subcategory.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {subcategory.tags.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <button
                                type="button"
                                onClick={() => handleEditSubcategory(index)}
                                className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSubcategory(index)}
                                className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/view-categories"
                  className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !newCategory.trim()}
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isEditMode ? 'Updating...' : 'Adding Category...'}</span>
                    </>
                  ) : (
                    <>
                      {isEditMode ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      <span>{isEditMode ? 'Update Category' : 'Add Category'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCategoryPage;