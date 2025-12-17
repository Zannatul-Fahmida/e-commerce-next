/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import DashboardNavbar from "@/components/dashboard/DashboardNavbar";
import { ArrowLeft, DollarSign, FileText, Hash, ImageIcon, Menu, Package, Save, Tag, X } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";
import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Separate component for handling search params
const EditModeHandler = ({ 
  categories,
  subcategories,
  setIsEditMode, 
  setEditingProductId, 
  setProductData,
  setSelectedSubcategory,
  setSelectedCategory,
  setSelectedTags,
  setSelectedProductType
}: {
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; category_id: string }[];
  setIsEditMode: (value: boolean) => void;
  setEditingProductId: (value: string | null) => void;
  setProductData: (value: any) => void;
  setSelectedSubcategory: (value: string) => void;
  setSelectedCategory: (value: string) => void;
  setSelectedTags: (value: string[]) => void;
  setSelectedProductType: (value: string) => void;
}) => {
  const searchParams = useSearchParams();

  const loadProductForEdit = async (productId: string) => {
    try {
      const { data: product, error } = await supabase
        .from("products")
        .select(`
          *,
          subcategories (
            id,
            name,
            category_id,
            categories (
              id,
              name
            )
          )
        `)
        .eq("id", productId)
        .single();

      if (error) throw error;

      if (product) {
        setProductData({
          name: product.name,
          description: product.description ? product.description.split('\n') : [""],
          summary: product.summary ? product.summary.split('\n') : [""],
          price: product.price.toString(),
          discount_price: product.discount_price ? product.discount_price.toString() : "",
          stock: product.stock.toString(),
          cover_image: product.cover_image,
          cover_image_path: "",
          additional_images: product.additional_images || [],
          additional_image_paths: [],
          options: product.options || [],
        });

        setSelectedSubcategory(product.subcategory_id);
        setSelectedCategory(product.subcategories.category_id);
        
        // Set product type
        setSelectedProductType(product.product_type || "none");

        // Load tags for this product
        const { data: productTags } = await supabase
          .from("product_tags")
          .select("tags(name)")
          .eq("product_id", productId);

        if (productTags) {
          const tagNames = productTags.map((pt: any) => pt.tags.name);
          setSelectedTags(tagNames);
        }
      }
    } catch (error) {
      console.error("Error loading product for edit:", error);
      toast.error("Failed to load product for editing");
    }
  };

  // Handle edit mode
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditMode(true);
      setEditingProductId(editId);
      loadProductForEdit(editId);
    }
  }, [searchParams, categories, subcategories]);

  return null; // This component doesn't render anything
};

const AddProductPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string; category_id: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<string>("none");
  const [productData, setProductData] = useState({
    name: "",
    description: [""] as string[],
    summary: [""] as string[],
    price: "",
    discount_price: "",
    stock: "",
    cover_image: "",
    cover_image_path: "",
    additional_images: [] as string[],
    additional_image_paths: [] as string[],
    options: [] as { name: string; price: string; image: string; image_path: string }[],
  });

  const router = useRouter();

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const fetchData = async () => {
      const [categoriesRes, subcategoriesRes, tagsRes] = await Promise.all([
        supabase.from("categories").select("id, name"),
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



  useEffect(() => {
    const fetchSubcategoryTags = async () => {
      if (selectedSubcategory) {
        const { data, error } = await supabase
          .from("subcategory_tags")
          .select("tags(id, name)")
          .eq("subcategory_id", selectedSubcategory);
        
        if (error) {
          console.error("Error fetching subcategory tags:", error);
          setTags([]);
          return;
        }

        const subcategoryTags = data.map((item: any) => item.tags).filter(Boolean);
        setTags(subcategoryTags);
      } else {
        const { data, error } = await supabase.from("tags").select("id, name");
        if (error) {
          console.error("Error fetching all tags:", error);
          setTags([]);
        } else {
          setTags(data);
        }
      }
    };
    fetchSubcategoryTags();
  }, [selectedSubcategory]);

  const handleAddTag = (e?: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement>) => {
    if (e && 'key' in e && e.key !== "Enter") return;
    if (e && 'key' in e) e.preventDefault();
    
    if (newTag.trim()) {
      const newTags = newTag
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag && !selectedTags.includes(tag));
      if (newTags.length > 0) {
        setSelectedTags([...selectedTags, ...newTags]);
        setNewTag("");
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `products/cover_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);
    if (error) {
      toast.error(`Cover image upload failed: ${error.message}`);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(data.path);
    setProductData((prev) => ({
      ...prev,
      cover_image: urlData.publicUrl,
      cover_image_path: data.path,
    }));
  };

  const handleRemoveCoverImage = async () => {
    if (productData.cover_image_path) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove([productData.cover_image_path]);
      if (error) {
        toast.error(`Failed to remove cover image: ${error.message}`);
        return;
      }
    }
    setProductData((prev) => ({ ...prev, cover_image: "", cover_image_path: "" }));
  };

  const handleAdditionalImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadedImages: string[] = [];
    const uploadedImagePaths: string[] = [];
    for (const file of Array.from(files)) {
      const filePath = `products/additional_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);
      if (error) {
        toast.error(`Additional image upload failed: ${error.message}`);
        return;
      }
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(data.path);
      uploadedImages.push(urlData.publicUrl);
      uploadedImagePaths.push(data.path);
    }
    setProductData((prev) => ({
      ...prev,
      additional_images: [...prev.additional_images, ...uploadedImages],
      additional_image_paths: [...prev.additional_image_paths, ...uploadedImagePaths],
    }));
  };

  const handleRemoveAdditionalImage = async (index: number) => {
    const imagePath = productData.additional_image_paths[index];
    if (imagePath) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove([imagePath]);
      if (error) {
        toast.error(`Failed to remove additional image: ${error.message}`);
        return;
      }
    }
    setProductData((prev) => ({
      ...prev,
      additional_images: prev.additional_images.filter((_, i) => i !== index),
      additional_image_paths: prev.additional_image_paths.filter((_, i) => i !== index),
    }));
  };

  const handleAddOption = () => {
    setProductData((prev) => ({
      ...prev,
      options: [...prev.options, { name: "", price: "", image: "", image_path: "" }],
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string) => {
    setProductData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return { ...prev, options: newOptions };
    });
  };

  const handleOptionImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const filePath = `products/option_${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from("product-images")
      .upload(filePath, file);
    if (error) {
      toast.error(`Option image upload failed: ${error.message}`);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(data.path);
    
    setProductData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], image: urlData.publicUrl, image_path: data.path };
      return { ...prev, options: newOptions };
    });
  };

  const handleRemoveOptionImage = async (index: number) => {
    const imagePath = productData.options[index].image_path;
    if (imagePath) {
      const { error } = await supabase.storage
        .from("product-images")
        .remove([imagePath]);
      if (error) {
        toast.error(`Failed to remove option image: ${error.message}`);
        return;
      }
    }
    setProductData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = { ...newOptions[index], image: "", image_path: "" };
      return { ...prev, options: newOptions };
    });
  };

  const handleRemoveOption = (index: number) => {
    setProductData((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleAddSummaryLine = () => {
    setProductData((prev) => ({
      ...prev,
      summary: [...prev.summary, ""],
    }));
  };

  const handleSummaryChange = (index: number, value: string) => {
    setProductData((prev) => {
      const newSummary = [...prev.summary];
      newSummary[index] = value;
      return { ...prev, summary: newSummary };
    });
  };

  const handleRemoveSummaryLine = (index: number) => {
    setProductData((prev) => ({
      ...prev,
      summary: prev.summary.filter((_, i) => i !== index),
    }));
  };

  const handleAddDescriptionLine = () => {
    setProductData((prev) => ({
      ...prev,
      description: [...prev.description, ""],
    }));
  };

  const handleDescriptionChange = (index: number, value: string) => {
    setProductData((prev) => {
      const newDescription = [...prev.description];
      newDescription[index] = value;
      return { ...prev, description: newDescription };
    });
  };

  const handleRemoveDescriptionLine = (index: number) => {
    setProductData((prev) => ({
      ...prev,
      description: prev.description.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set loading state
    setIsSubmitting(true);
    
    // Validation
    if (!productData.name.trim()) {
      toast.error("Product name is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!selectedCategory) {
      toast.error("Category is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!selectedSubcategory) {
      toast.error("Subcategory is required");
      setIsSubmitting(false);
      return;
    }
    
    if (!productData.cover_image) {
      toast.error("Cover image is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const productPayload = {
        name: productData.name.trim(),
        description: productData.description.join("\n"),
        summary: productData.summary.join("\n"),
        price: parseFloat(productData.price) || 0,
        discount_price: parseFloat(productData.discount_price) || null,
        stock: parseInt(productData.stock) || 0,
        subcategory_id: selectedSubcategory,
        cover_image: productData.cover_image,
        additional_images: productData.additional_images,
        product_type: selectedProductType === "none" ? null : selectedProductType,
        options: productData.options.map(opt => ({
          name: opt.name,
          price: parseFloat(opt.price) || 0,
          image: opt.image || null,
        })),
      };

      let product;
      if (isEditMode && editingProductId) {
        // Update existing product
        const { data, error } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingProductId)
          .select()
          .single();

        if (error) throw error;
        product = data;

        // Remove existing product tags
        await supabase
          .from("product_tags")
          .delete()
          .eq("product_id", editingProductId);
      } else {
        // Create new product
        const { data, error } = await supabase
          .from("products")
          .insert(productPayload)
          .select()
          .single();

        if (error) throw error;
        product = data;
      }

      if (!product) throw new Error("No product data returned");

      // Handle tags
      if (selectedTags.length > 0) {
        for (const tagName of selectedTags) {
          let tagId;
          const { data: tagData, error: tagError } = await supabase
            .from("tags")
            .select("id")
            .eq("name", tagName)
            .maybeSingle();

          if (tagError) throw tagError;
          if (!tagData) {
            const { data: newTagData, error: newTagError } = await supabase
              .from("tags")
              .insert({ name: tagName })
              .select()
              .maybeSingle();
            if (newTagError) throw newTagError;
            if (!newTagData) throw new Error("No new tag data returned");
            tagId = newTagData.id;
          } else {
            tagId = tagData.id;
          }

          const { error: productTagError } = await supabase
            .from("product_tags")
            .insert({ product_id: product.id, tag_id: tagId });
          if (productTagError) throw productTagError;

          const { data: existingTag, error: checkError } = await supabase
            .from("subcategory_tags")
            .select("id")
            .eq("subcategory_id", selectedSubcategory)
            .eq("tag_id", tagId)
            .maybeSingle();

          if (checkError) throw checkError;

          if (!existingTag) {
            const { error: junctionError } = await supabase
              .from("subcategory_tags")
              .insert({ subcategory_id: selectedSubcategory, tag_id: tagId });
            if (junctionError) throw junctionError;
          }
        }
      }

      toast.success(isEditMode ? "Product updated successfully!" : "Product added successfully!");
      
      // Reset form if adding new product, redirect if editing
      if (isEditMode) {
        router.push("/dashboard/view-products");
      } else {
        setProductData({
          name: "",
          description: [""],
          summary: [""],
          price: "",
          discount_price: "",
          stock: "",
          cover_image: "",
          cover_image_path: "",
          additional_images: [],
          additional_image_paths: [],
          options: [],
        });
        setSelectedCategory("");
        setSelectedSubcategory("");
        setSelectedTags([]);
        setNewTag("");
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      
      // Better error handling
      let errorMessage = "An unexpected error occurred";
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(`Failed to ${isEditMode ? 'update' : 'add'} product: ${errorMessage}`);
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
          setEditingProductId={setEditingProductId}
          setProductData={setProductData}
          setSelectedSubcategory={setSelectedSubcategory}
          setSelectedCategory={setSelectedCategory}
          setSelectedTags={setSelectedTags}
          setSelectedProductType={setSelectedProductType}
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
                      href="/dashboard/view-products"
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {isEditMode ? 'Edit Product' : 'Add Product'}
                    </h1>
                  </div>
                  <p className="text-gray-600 mt-1 ml-11">
                    {isEditMode ? 'Update product information' : 'Create and manage your product catalog'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <Package className="w-5 h-5" />
                    <span>Basic Information</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Essential product details</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Product Name */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>Product Name</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={productData.name}
                        onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Enter product name (e.g., ZANNUO Kids Water Bottle)"
                        required
                      />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Tag className="w-4 h-4" />
                          <span>Category</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setSelectedSubcategory("");
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        required
                      >
                        <option value="">Select a category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Hash className="w-4 h-4" />
                          <span>Subcategory</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <select
                        value={selectedSubcategory}
                        onChange={(e) => setSelectedSubcategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={!selectedCategory}
                        required
                      >
                        <option value="">Select a subcategory</option>
                        {subcategories
                          .filter((sub) => sub.category_id === selectedCategory)
                          .map((subcategory) => (
                            <option key={subcategory.id} value={subcategory.id}>
                              {subcategory.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>Price</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={productData.price}
                        onChange={(e) => setProductData({ ...productData, price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Discount Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4" />
                          <span>Discount Price</span>
                          <span className="text-xs text-gray-500">(Optional)</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={productData.discount_price}
                        onChange={(e) => setProductData({ ...productData, discount_price: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Stock */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Package className="w-4 h-4" />
                          <span>Stock Quantity</span>
                          <span className="text-red-500">*</span>
                        </span>
                      </label>
                      <input
                        type="number"
                        value={productData.stock}
                        onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="0"
                        required
                      />
                    </div>

                    {/* Product Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Tag className="w-4 h-4" />
                          <span>Product Type</span>
                        </span>
                      </label>
                      <select
                        value={selectedProductType}
                        onChange={(e) => setSelectedProductType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      >
                        <option value="none">None</option>
                        <option value="best_deals">Best Deals</option>
                        <option value="featured">Featured</option>
                      </select>
                    </div>

                    {/* Tags */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center space-x-2">
                          <Hash className="w-4 h-4" />
                          <span>Tags</span>
                          <span className="text-xs text-gray-500">(Press Enter to add)</span>
                        </span>
                      </label>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="Enter tags (e.g., Disney, Hot Wheels)"
                        list="tag-suggestions"
                        onKeyPress={handleAddTag}
                        autoComplete="off"
                      />
                      <datalist id="tag-suggestions">
                        {tags.map((tag) => (
                          <option key={tag.id} value={tag.name} />
                        ))}
                      </datalist>
                      {selectedTags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedTags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 border border-primary-200">
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
                  </div>
                </div>
              </div>

              {/* Product Description */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Product Description</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Detailed product information</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Summary Points
                      </label>
                      {productData.summary.map((line, index) => (
                        <div key={index} className="flex items-center mb-2">
                          <input
                            type="text"
                            value={line}
                            onChange={(e) => handleSummaryChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            placeholder={`Summary line ${index + 1} (e.g., - Brand: ZANNUO)`}
                          />
                          {productData.summary.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSummaryLine(index)}
                              className="ml-2 p-2 text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddSummaryLine}
                        className="mt-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Line</span>
                      </button>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description Points
                      </label>
                      {productData.description.map((line, index) => (
                        <div key={index} className="flex items-center mb-2">
                          <input
                            type="text"
                            value={line}
                            onChange={(e) => handleDescriptionChange(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                            placeholder={`Description line ${index + 1} (e.g., - Kid's water bottle)`}
                          />
                          {productData.description.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDescriptionLine(index)}
                              className="ml-2 p-2 text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddDescriptionLine}
                        className="mt-2 px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Line</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Images */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <ImageIcon className="w-5 h-5" />
                    <span>Product Images</span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Upload product images</p>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cover Image */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cover Image <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {productData.cover_image ? (
                          <div className="relative">
                            <Image
                              src={productData.cover_image}
                              alt="Cover"
                              width={200}
                              height={200}
                              className="w-full h-48 object-cover rounded-md"
                            />
                            <button
                              type="button"
                              onClick={handleRemoveCoverImage}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4">
                              <label className="cursor-pointer">
                                <span className="mt-2 block text-sm font-medium text-gray-900">
                                  Upload cover image
                                </span>
                                <input
                                  type="file"
                                  className="sr-only"
                                  accept="image/*"
                                  onChange={handleCoverImageUpload}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Images */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Images
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <label className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload additional images
                              </span>
                              <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                multiple
                                onChange={handleAdditionalImagesUpload}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                      {productData.additional_images.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          {productData.additional_images.map((image, index) => (
                            <div key={index} className="relative">
                              <Image
                                src={image}
                                alt={`Additional ${index + 1}`}
                                width={100}
                                height={100}
                                className="w-full h-24 object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveAdditionalImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Options */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <Package className="w-5 h-5" />
                        <span>Product Options</span>
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">Add product variants or options</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Option</span>
                    </button>
                  </div>
                </div>

                {productData.options.length > 0 && (
                  <div className="p-6">
                    <div className="space-y-4">
                      {productData.options.map((option, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-gray-900">Option {index + 1}</h3>
                            <button
                              type="button"
                              onClick={() => handleRemoveOption(index)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Option Name
                              </label>
                              <input
                                type="text"
                                value={option.name}
                                onChange={(e) => handleOptionChange(index, "name", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                placeholder="e.g., Size, Color"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Additional Price
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={option.price}
                                onChange={(e) => handleOptionChange(index, "price", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Option Image
                              </label>
                              {option.image ? (
                                <div className="relative">
                                  <Image
                                    src={option.image}
                                    alt={`Option ${index + 1}`}
                                    width={60}
                                    height={60}
                                    className="w-16 h-16 object-cover rounded-md"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOptionImage(index)}
                                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="cursor-pointer">
                                  <div className="w-16 h-16 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                  </div>
                                  <input
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={(e) => handleOptionImageUpload(index, e)}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="px-6 py-4">
                  <div className="flex justify-end space-x-3">
                    <Link
                      href="/dashboard/view-products"
                      className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                    >
                      Cancel
                    </Link>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{isEditMode ? 'Updating...' : 'Adding Product...'}</span>
                        </>
                      ) : (
                        <>
                          {isEditMode ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                          <span>{isEditMode ? 'Update Product' : 'Add Product'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;