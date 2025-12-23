/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, getUserCached } from "@/lib/supabase";
import { toast } from "sonner";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Package, DollarSign, Calendar, CreditCard, ShoppingCart } from "lucide-react";

interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price?: number;
  selected_option?: string | null;
}

interface Order {
  id: string;
  transaction_id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  payment_method: 'cod' | 'online';
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'return_requested' | 'returned' | 'cancelled' | 'failed_delivery';
  // Aggregated items for the order
  items: OrderItem[];
  // Legacy fields for backward compatibility
  legacy_product_name?: string;
  legacy_quantity?: number;
}

const MyOrdersPage = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const router = useRouter();

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
      case 'processing':
      case 'shipped':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'return_requested':
      case 'returned':
        return 'bg-orange-100 text-orange-800';
      case 'cancelled':
      case 'failed_delivery':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPaymentStatus = (paymentStatus: string) => {
    return paymentStatus
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Get the current user from Supabase auth
        const { data: { user } } = await getUserCached();
        if (!user) {
          toast.error('Please log in to access the dashboard');
          router.push('/login');
          return;
        }

        // Fetch the user's role from the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          toast.error('Failed to fetch user role');
          router.push('/login');
          return;
        }

        setRole(data.role);
      } catch (err) {
        toast.error('An unexpected error occurred');
        console.error(err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setOrdersLoading(true);
        const { data: { user } } = await getUserCached();
        if (!user) {
          toast.error("Please log in to view your orders");
          setOrdersLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("orders")
          .select(`
            id, transaction_id, status, amount, currency, created_at, payment_method, order_status, quantity, product_id,
            products!fk_product_id(name)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching orders:", error);
          toast.error(`Failed to fetch orders: ${error.message}`);
          setOrders([]);
        } else {
          // Normalize into aggregated items with a legacy fallback
          let normalized = data.map((order: any) => {
            const items: OrderItem[] = order.product_id
              ? [
                  {
                    product_id: order.product_id,
                    quantity: order.quantity,
                    product_name: order.products?.name || "",
                  },
                ]
              : [];

            return {
              id: order.id,
              transaction_id: order.transaction_id,
              status: order.status,
              amount: order.amount,
              currency: order.currency,
              created_at: order.created_at,
              payment_method: order.payment_method,
              order_status: order.order_status,
              items,
              legacy_product_name: order.products?.name,
              legacy_quantity: order.quantity,
            } as Order;
          });
          // Fallback: fill missing product names via a single products query
          const missingProductIds = Array.from(new Set(
            normalized.flatMap((o) => o.items.filter((i) => !i.product_name).map((i) => i.product_id))
          ));

          if (missingProductIds.length > 0) {
            const { data: prodList, error: prodErr } = await supabase
              .from('products')
              .select('id, name')
              .in('id', missingProductIds);

            if (!prodErr && prodList) {
              const nameMap = new Map<string, string>(prodList.map((p: any) => [p.id, p.name]));
              normalized = normalized.map((o) => ({
                ...o,
                items: o.items.map((i) => ({
                  ...i,
                  product_name: i.product_name || nameMap.get(i.product_id) || i.product_name || '',
                })),
              }));
            }
          }

          setOrders(normalized);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        toast.error("An unexpected error occurred");
        setOrders([]);
      } finally {
        setOrdersLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (role === 'admin' || role === 'customer') {
    return (
      <DashboardLayout userRole={role} hideStats={true}>
        <div className="w-full">
          <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">My Orders</h2>
              <p className="text-gray-600 mt-1">View and track all your orders</p>
            </div>
            
            {ordersLoading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No orders found</h3>
                <p className="text-gray-500">You haven&apos;t placed any orders yet.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto w-full">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transaction ID
                        </th> */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order.id.slice(0, 8)}...
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="block max-w-[100px] truncate" title={order.transaction_id}>
                              {order.transaction_id}
                            </span>
                          </td> */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              const summary = order.items && order.items.length > 0
                                ? order.items.map(i => `${i.quantity} x ${i.product_name || 'N/A'}`).join(', ')
                                : (order.legacy_quantity && order.legacy_product_name)
                                  ? `${order.legacy_quantity} x ${order.legacy_product_name}`
                                  : 'N/A';
                              return (
                                <span className="block max-w-[220px] truncate" title={summary}>
                                  {summary}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.amount.toFixed(2)} {order.currency}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.order_status)}`}
                            >
                              {formatPaymentStatus(order.order_status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method === 'online' ? 'Online Payment' : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4 p-4">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      {/* Header with Order ID and Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <ShoppingCart className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            Order #{order.id.slice(0, 8)}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.order_status)}`}
                        >
                          {formatPaymentStatus(order.order_status)}
                        </span>
                      </div>

                      {/* Product and Amount */}
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Product:</span>
                          {(() => {
                            const summary = order.items && order.items.length > 0
                              ? order.items.map(i => `${i.quantity} x ${i.product_name || 'N/A'}`).join(', ')
                              : (order.legacy_quantity && order.legacy_product_name)
                                ? `${order.legacy_quantity} x ${order.legacy_product_name}`
                                : 'N/A';
                            return (
                              <span className="text-sm font-medium text-gray-900 truncate max-w-[220px]" title={summary}>
                                {summary}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Amount:</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {order.amount.toFixed(2)} {order.currency}
                          </span>
                        </div>
                      </div>

                      {/* Transaction and Date */}
                      <div className="grid grid-cols-1 gap-1 mb-3">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">TXN:</span>
                          <span className="text-xs text-gray-500 truncate max-w-[180px]" title={order.transaction_id}>
                            {order.transaction_id}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    );
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid role. Please contact support.</p>
      </div>
    );
  }
};

export default MyOrdersPage;
