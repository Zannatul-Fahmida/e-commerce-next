/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase, getSessionCached, getUserCached } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";
import { Info, ShoppingCart, CreditCard, Truck, Heart } from "lucide-react";
import axios from "axios";
import { SidebarWrapper } from "@/components/common/SidebarWrapper";
import { Navbar } from "@/components/common/Navbar";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";

const ProductDetailsPage = () => {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite, loading: favLoading } = useFavorites();
  const [isFavToggling, setIsFavToggling] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("id", params.id)
          .single();

        if (error) {
          console.error("Error fetching product:", error);
          return;
        }

        setProduct(data);
        if (data.options && data.options.length > 0) {
          setSelectedOption(data.options[0].name);
        } else {
          // If no options, set a default value to enable checkout
          setSelectedOption("default");
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchProfile = async () => {
      try {
        const { data: { session } } = await getSessionCached();
        if (!session) {
          setProfile(null);
          return;
        }
        const { data: { user } } = await getUserCached();
        if (user) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          
          if (profileError) {
            console.error("Error fetching profile:", profileError);
            setProfile(null);
            return;
          }
          
          setProfile(profileData);
        } else {
          // No authenticated user - set profile to null
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      }
    };

    if (params.id) {
      fetchProduct();
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        (window as any).requestIdleCallback(() => fetchProfile());
      } else {
        setTimeout(() => fetchProfile(), 0);
      }
    }
  }, [params.id]);

  const handleOptionChange = (optionName: string) => {
    setSelectedOption(optionName);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleAddToCart = async () => {
    if (!profile) {
      toast.error("Please log in to add items to cart");
      router.push("/login");
      return;
    }

    if (!selectedOption || selectedOption === "") {
      toast.error("Please select a product option");
      return;
    }

    if (product.stock === 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1, selectedOption);
      toast.success("Product added to cart successfully!");
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error("Failed to add product to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleCheckout = async () => {
    // Check authentication first
    if (!profile) {
      toast.error("Please log in to proceed with checkout");
      router.push("/login");
      return;
    }

    if (!selectedOption || selectedOption === "") {
      toast.error("Please select a product option");
      return;
    }

    if (product.stock === 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    // If online payment is selected, show a toast and exit (coming soon)
    if (paymentMethod === 'online') {
      toast.info('Coming soon');
      return;
    }

    setIsCheckingOut(true);
    try {
      const selectedOptionData = product.options.find(
        (option: any) => option.name === selectedOption
      );
      const price = selectedOptionData?.price || product.price;
      const tempTransactionId = `TEMP_${Date.now()}`;

      // Create order in database
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            transaction_id: tempTransactionId,
            status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
            order_status: 'pending',
            amount: product.price,
            currency: 'BDT',
            product_id: product.id,
            user_id: profile.id,
            payment_method: paymentMethod
          })
          .select()
          .single();

      if (orderError) {
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      console.log("Order created:", { orderId: orderData.id, tempTransactionId });

      if (paymentMethod === 'cod') {
        // For Cash on Delivery, skip payment process
        toast.success("Order placed successfully! You will pay on delivery.");
        router.push("/dashboard/my-orders");
        return;
      }

      // For online payment, proceed with SSLCommerz
      const response = await axios.post("/api/sslcommerz/checkout", {
        product_id: product.id,
        product_name: product.name,
        amount: price,
        currency: "BDT",
        customer_name: profile.full_name || "Customer",
        customer_email: profile.email || "customer@example.com",
        customer_phone: profile.phone || "1234567890",
        order_id: orderData.id,
      });

      console.log("Checkout API response:", response.data);

      const { GatewayPageURL, transaction_id } = response.data;
      if (!GatewayPageURL || !transaction_id) {
        throw new Error("Failed to initiate payment: Missing GatewayPageURL or transaction_id");
      }

      // Update order with actual transaction ID
      const { error: updateError } = await supabase
        .from("orders")
        .update({ transaction_id })
        .eq("id", orderData.id);

      if (updateError) {
        console.error("Failed to update transaction ID:", {
          orderId: orderData.id,
          transaction_id,
          error: updateError.message,
        });
        throw new Error(`Failed to update transaction ID: ${updateError.message}`);
      }

      console.log("Transaction ID updated:", { orderId: orderData.id, transaction_id });

      // Redirect to SSLCommerz payment page
      router.push(GatewayPageURL);
    } catch (error) {
      console.error("Checkout error:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error("Error initiating payment");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleProceedToCheckout = () => {
    setShowPaymentOptions(true);
  };

  if (loading) return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="p-6 text-center text-gray-600 animate-pulse">Loading...</div>
      </div>
    </div>
  );
  
  if (!product) return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <div className="p-6 text-center text-red-500">Product not found</div>
      </div>
    </div>
  );

  const isOutOfStock = product.stock === 0;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 sm:p-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                {product.name}
              </h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="relative">
                    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                      Cover Image{' '}
                      <span className="group relative ml-2">
                        <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                        <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Main product image
                        </span>
                      </span>
                    </h2>
                    {product.cover_image && (
                  <div className="relative w-full h-80 sm:h-96 rounded-xl overflow-hidden border-2 border-primary-100 hover:border-primary-300 transition-all duration-300">
                    <Image
                      src={product.cover_image}
                      alt={`${product.name} Cover`}
                      layout="fill"
                      objectFit="contain"
                      className="rounded-xl"
                    />
                    {/* Favorite toggle on cover image */}
                    <button
                      onClick={async () => {
                        if (isFavToggling || favLoading) return;
                        setIsFavToggling(true);
                        try {
                          await toggleFavorite(product.id);
                        } finally {
                          setIsFavToggling(false);
                        }
                      }}
                      aria-label={isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                      className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all duration-300 ${
                        isFavorite(product.id) ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-red-600 hover:text-white'
                      } ${isFavToggling ? 'opacity-80' : ''}`}
                    >
                      <Heart size={18} className={isFavorite(product.id) ? 'fill-current' : ''} />
                    </button>
                  </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                      Additional Images{' '}
                      <span className="group relative ml-2">
                        <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                        <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Additional product images
                        </span>
                      </span>
                    </h2>
                    {product.additional_images && product.additional_images.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {product.additional_images.map((image: string, index: number) => (
                          <div key={index} className="relative w-full h-40 sm:h-48 rounded-xl overflow-hidden border-2 border-primary-100 hover:border-primary-300 transition-all duration-300">
                            <Image
                              src={image}
                              alt={`${product.name} Image ${index + 1}`}
                              layout="fill"
                              objectFit="contain"
                              className="rounded-xl"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No additional images available</p>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                      Summary{' '}
                      <span className="group relative ml-2">
                        <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                        <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Product summary
                        </span>
                      </span>
                    </h2>
                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                      <ul className="space-y-2">
                        {product.summary.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => (
                          <li key={index} className="text-gray-700 leading-relaxed flex items-start">
                            <span className="text-primary-500 mr-2 mt-1">•</span>
                            <span>{line.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                      Description{' '}
                      <span className="group relative ml-2">
                        <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                        <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Detailed product description
                        </span>
                      </span>
                    </h2>
                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                      <ul className="space-y-2">
                        {product.description.split('\n').filter((line: string) => line.trim()).map((line: string, index: number) => (
                          <li key={index} className="text-gray-700 leading-relaxed flex items-start">
                            <span className="text-primary-500 mr-2 mt-1">•</span>
                            <span>{line.trim()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                      Pricing & Stock{' '}
                      <span className="group relative ml-2">
                        <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                        <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          Price and availability information
                        </span>
                      </span>
                    </h2>
                    <div className="bg-primary-50 p-4 rounded-xl border border-primary-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">
                          {product.discount_price ? 'Original Price:' : 'Price:'}
                        </span>
                        <span className={`font-bold text-lg ${product.discount_price ? 'text-gray-500 line-through' : 'text-primary-600'}`}>
                          ৳{product.price}
                        </span>
                      </div>
                      {product.discount_price && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Discounted Price:</span>
                          <span className="text-primary-600 font-bold text-lg">৳{product.discount_price}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Stock:</span>
                        <span className={`font-semibold ${isOutOfStock ? 'text-red-500' : 'text-green-600'}`}>
                          {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {product.options && product.options.length > 0 && (
                    <div>
                      <h2 className="text-xl font-semibold text-gray-700 mb-3 flex items-center">
                        Options{' '}
                        <span className="group relative ml-2">
                          <Info size={18} className="text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
                          <span className="absolute -bottom-3 left-6 transform mb-2 w-max px-2 py-1 text-sm text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            Available product options
                          </span>
                        </span>
                      </h2>
                      <div className="space-y-3">
                        {product.options.map((option: any, index: number) => (
                          <div
                            key={index}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                              selectedOption === option.name
                                ? 'border-primary-500 bg-primary-50'
                                : 'border-primary-200 bg-white hover:border-primary-300'
                            }`}
                            onClick={() => handleOptionChange(option.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {option.image && (
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-primary-200">
                                    <Image
                                      src={option.image}
                                      alt={option.name}
                                      layout="fill"
                                      objectFit="cover"
                                      className="rounded-lg"
                                    />
                                  </div>
                                )}
                                <div>
                                  <h3 className={`font-semibold ${
                                    selectedOption === option.name ? 'text-primary-700' : 'text-gray-700'
                                  }`}>
                                    {option.name}
                                  </h3>
                                  {option.description && (
                                    <p className="text-sm text-gray-500">{option.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`font-bold text-lg ${
                                  selectedOption === option.name ? 'text-primary-600' : 'text-gray-600'
                                }`}>
                                  ৳{option.price}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 space-y-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart || (!selectedOption || selectedOption === "") || !profile || isOutOfStock}
                      className={`w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                        isAddingToCart || (!selectedOption || selectedOption === "") || !profile || isOutOfStock
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-secondary-600 hover:bg-secondary-700 shadow-md hover:shadow-lg"
                      }`}
                    >
                      <ShoppingCart size={20} />
                      <span>
                        {isOutOfStock 
                          ? "Out of Stock" 
                          : isAddingToCart 
                          ? "Adding to Cart..." 
                          : "Add to Cart"
                        }
                      </span>
                    </button>
                    
                    {!showPaymentOptions ? (
                      <button
                        onClick={handleProceedToCheckout}
                        disabled={(!selectedOption || selectedOption === "") || !profile || isOutOfStock}
                        className={`w-full py-3 px-6 rounded-xl text-white font-semibold transition-all duration-300 ${
                          (!selectedOption || selectedOption === "") || !profile || isOutOfStock
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg"
                        }`}
                      >
                        {isOutOfStock 
                          ? "Out of Stock" 
                          : "Proceed to Checkout"
                        }
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-primary-50 p-4 rounded-xl border border-primary-100">
                          <h3 className="text-lg font-semibold text-gray-700 mb-3">Select Payment Method</h3>
                          <div className="space-y-3">
                            <div
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                paymentMethod === 'online'
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-primary-200 bg-white hover:border-primary-300'
                              }`}
                              onClick={() => setPaymentMethod('online')}
                            >
                              <div className="flex items-center space-x-3">
                                <CreditCard size={24} className={`${
                                  paymentMethod === 'online' ? 'text-primary-600' : 'text-gray-500'
                                }`} />
                                <div>
                                  <h4 className={`font-semibold ${
                                    paymentMethod === 'online' ? 'text-primary-700' : 'text-gray-700'
                                  }`}>
                                    Online Payment
                                  </h4>
                                  <p className="text-sm text-gray-500">Pay securely with card or mobile banking</p>
                                </div>
                              </div>
                            </div>
                            
                            <div
                              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                                paymentMethod === 'cod'
                                  ? 'border-primary-500 bg-primary-50'
                                  : 'border-primary-200 bg-white hover:border-primary-300'
                              }`}
                              onClick={() => setPaymentMethod('cod')}
                            >
                              <div className="flex items-center space-x-3">
                                <Truck size={24} className={`${
                                  paymentMethod === 'cod' ? 'text-primary-600' : 'text-gray-500'
                                }`} />
                                <div>
                                  <h4 className={`font-semibold ${
                                    paymentMethod === 'cod' ? 'text-primary-700' : 'text-gray-700'
                                  }`}>
                                    Cash on Delivery
                                  </h4>
                                  <p className="text-sm text-gray-500">Pay when you receive the product</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-3">
                          <button
                            onClick={() => setShowPaymentOptions(false)}
                            className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300"
                          >
                            Back
                          </button>
                          <button
                            onClick={handleCheckout}
                            disabled={isCheckingOut}
                            className={`flex-2 py-3 px-6 rounded-xl text-white font-semibold transition-all duration-300 ${
                              isCheckingOut
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-primary-600 hover:bg-primary-700 shadow-md hover:shadow-lg"
                            }`}
                          >
                            {isCheckingOut 
                              ? "Processing..." 
                              : paymentMethod === 'cod' 
                              ? "Place Order" 
                              : "Pay Now"
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProductDetailsPage;
