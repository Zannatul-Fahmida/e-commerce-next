/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft, CreditCard, Truck } from "lucide-react";
import { SidebarWrapper } from "@/components/common/SidebarWrapper";
import { Navbar } from "@/components/common/Navbar";
import ModalLayout from "@/components/common/ModalLayout";
import axios from "axios";

interface CartItemWithProduct {
  id: string;
  product_id: string;
  quantity: number;
  selected_option: string;
  product: {
    id: string;
    name: string;
    price: number;
    discount_price?: number;
    cover_image: string;
    stock: number;
    options?: any[];
  };
}

const CartPage = () => {
  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const [cartItemsWithProducts, setCartItemsWithProducts] = useState<CartItemWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const cleanUrl = (url?: string) => (url || '').replace(/\)+$/, '').trim();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        
        if (profileError) {
          console.error("Error fetching profile:", profileError);
          toast.error("Failed to load profile");
          return;
        }
        
        setProfile(profileData);
      } catch (error) {
        console.error("Error fetching profile:", error);
        router.push("/login");
        return;
      }
    };

    fetchProfile();
  }, [router]);

  useEffect(() => {
    const fetchCartItemsWithProducts = async () => {
      if (!profile) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cart")
          .select(`
            id,
            product_id,
            quantity,
            selected_option,
            products (
              id,
              name,
              price,
              discount_price,
              cover_image,
              stock,
              options
            )
          `)
          .eq("user_id", profile.id);

        if (error) {
          console.error("Error fetching cart items:", error);
          toast.error("Failed to load cart items");
          return;
        }

        // Transform the data to match CartItemWithProduct interface
        const transformedData = data?.map(item => ({
          id: item.id,
          product_id: item.product_id,
          quantity: item.quantity,
          selected_option: item.selected_option,
          product: Array.isArray(item.products) ? item.products[0] : item.products
        })) || [];

        setCartItemsWithProducts(transformedData);
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load cart items");
      } finally {
        setLoading(false);
      }
    };

    if (profile) {
      fetchCartItemsWithProducts();
    }
  }, [profile, items]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleQuantityUpdate = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      await updateQuantity(cartItemId, newQuantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    try {
      await removeFromCart(cartItemId);
      toast.success("Item removed from cart");
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item");
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      toast.success("Cart cleared successfully");
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart");
    }
  };

  const getItemPrice = (item: CartItemWithProduct) => {
    const product = item.product;
    if (product.options && product.options.length > 0) {
      const selectedOption = product.options.find(opt => opt.name === item.selected_option);
      return selectedOption?.price || product.discount_price || product.price;
    }
    return product.discount_price || product.price;
  };

  const getTotalPrice = () => {
    return cartItemsWithProducts.reduce((total, item) => {
      return total + (getItemPrice(item) * item.quantity);
    }, 0);
  };

  const getTotalItems = () => {
    return cartItemsWithProducts.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async () => {
    // Check authentication first
    if (!profile) {
      toast.error("Please log in to proceed with checkout");
      router.push("/login");
      return;
    }

    if (cartItemsWithProducts.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // If online payment is selected, show a toast and exit (coming soon)
    if (paymentMethod === 'online') {
      toast.info('Coming soon');
      return;
    }

    // Check stock for all items
    for (const item of cartItemsWithProducts) {
      if (item.product.stock < item.quantity) {
        toast.error(`Insufficient stock for ${item.product.name}`);
        return;
      }
    }

    setIsCheckingOut(true);
    try {
   
      const totalAmount = getTotalPrice();

      // Create a single order for the entire cart
      const uniqueTransactionId = `TEMP_${Date.now()}`;
      const firstProductId = cartItemsWithProducts[0].product_id;
      const totalItemsCount = getTotalItems();

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          transaction_id: uniqueTransactionId,
          status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
          order_status: 'pending',
          amount: totalAmount,
          currency: 'BDT',
          // Keep a representative product_id for compatibility with legacy queries
          product_id: firstProductId,
          user_id: profile.id,
          payment_method: paymentMethod,
          // Store total item count as quantity for legacy views
          quantity: totalItemsCount,
        })
        .select()
        .single();

      if (orderError || !orderData) {
        throw new Error(`Failed to create order: ${orderError?.message || 'Unknown error'}`);
      }

      console.log('Order created successfully:', { orderId: orderData.id });

      if (paymentMethod === 'cod') {
        // For Cash on Delivery, clear cart and redirect
        console.log("COD payment selected, clearing cart and redirecting...");
        await clearCart();
        toast.success("Orders placed successfully! You will pay on delivery.");
        console.log("Redirecting to my-orders page...");
        router.push("/dashboard/my-orders");
        return;
      }

      // For online payment, proceed with SSLCommerz
      console.log("Processing online payment with SSLCommerz...");
      const response = await axios.post("/api/sslcommerz/checkout", {
        product_id: firstProductId,
        product_name: `Cart Checkout - ${cartItemsWithProducts.length} items`,
        amount: totalAmount,
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

      // Update single order with actual transaction ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ transaction_id })
        .eq('id', orderData.id);

      if (updateError) {
        console.error('Failed to update transaction ID for order', { orderId: orderData.id, transaction_id, error: updateError.message });
        throw new Error(`Failed to update transaction ID: ${updateError.message}`);
      }
      console.log('Transaction ID updated for order', { orderId: orderData.id });

      // Clear cart before redirecting to payment
      await clearCart();

      // Redirect to SSLCommerz payment page
      router.push(GatewayPageURL);
    } catch (error) {
      console.error("Checkout error details:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorType: typeof error,
        errorObject: error,
        paymentMethod,
        cartItemsCount: cartItemsWithProducts.length,
        totalAmount: getTotalPrice()
      });
      toast.error(`Error during checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleProceedToCheckout = () => {
    setShowPaymentOptions(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
        <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
        <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
          <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your cart...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-primary-50/60 to-secondary-50/60">
      <SidebarWrapper isOpen={isSidebarOpen} onClose={closeSidebar} />
      <div className="flex-1 lg:ml-0 md:pt-20 pt-32">
        <Navbar onMenuToggle={toggleSidebar} isSidebarOpen={isSidebarOpen} />
        <main className="p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => router.back()}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft size={20} className="text-gray-600" />
                    </button>
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                      Shopping Cart
                    </h1>
                  </div>
                  {cartItemsWithProducts.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Trash2 size={16} />
                      <span>Clear Cart</span>
                    </button>
                  )}
                </div>

                {cartItemsWithProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag size={64} className="mx-auto text-gray-300 mb-4" />
                    <h2 className="text-2xl font-semibold text-gray-600 mb-2">Your cart is empty</h2>
                    <p className="text-gray-500 mb-6">Add some products to get started!</p>
                    <button
                      onClick={() => router.push("/products")}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      {cartItemsWithProducts.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                          <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                              src={cleanUrl(item.product.cover_image)}
                              alt={item.product.name}
                              layout="fill"
                              objectFit="cover"
                              className="rounded-lg"
                            />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 truncate">{item.product.name}</h3>
                            <p className="text-sm text-gray-500">Option: {item.selected_option}</p>
                            <p className="text-lg font-bold text-primary-600">৳{getItemPrice(item)}</p>
                            {item.product.stock < item.quantity && (
                              <p className="text-sm text-red-500">Only {item.product.stock} left in stock</p>
                            )}
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => handleQuantityUpdate(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="w-12 text-center font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantityUpdate(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                              className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus size={16} />
                            </button>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-lg">৳{getItemPrice(item) * item.quantity}</p>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors mt-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-6">
                      <div className="bg-primary-50 p-6 rounded-xl">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-lg font-semibold text-gray-700">Total Items:</span>
                          <span className="text-lg font-bold text-primary-600">{getTotalItems()}</span>
                        </div>
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-xl font-semibold text-gray-700">Total Amount:</span>
                          <span className="text-2xl font-bold text-primary-600">৳{getTotalPrice()}</span>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => router.push("/products")}
                            className="flex-1 py-3 px-6 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
                          >
                            Continue Shopping
                          </button>
                          <button
                            onClick={handleProceedToCheckout}
                            disabled={isCheckingOut}
                            className="flex-1 py-3 px-6 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Payment Options Modal */}
      <ModalLayout 
        isOpen={showPaymentOptions} 
        onClose={() => setShowPaymentOptions(false)}
      >
        <div 
          className="bg-white rounded-2xl p-6 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Select Payment Method
          </h3>
          
          <div className="space-y-4">
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
                  <p className="text-sm text-gray-500">Pay when your order arrives</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setShowPaymentOptions(false)}
              disabled={isCheckingOut}
              className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <button
              onClick={() => {
                setShowPaymentOptions(false);
                handleCheckout();
              }}
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
      </ModalLayout>
    </div>
  );
};

export default CartPage;
