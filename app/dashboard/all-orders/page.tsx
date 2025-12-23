/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import { Menu, ShoppingCart, Package, DollarSign, Calendar, User, CreditCard, MoreVertical, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase, getUserCached } from '@/lib/supabase';
import { toast } from 'sonner';

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
  status: 'pending' | 'success' | 'failed' | 'confirmed';
  order_status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'return_requested' | 'returned' | 'cancelled' | 'failed_delivery';
  amount: number;
  currency: string;
  user_id: string;
  created_at: string;
  payment_method?: string;
  items: OrderItem[];
  // Legacy fallback fields
  legacy_product_name?: string;
  legacy_quantity?: number;
  user_name?: string;
  user_email?: string;
}

const AllOrdersPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in and an admin
      const { data: { user } } = await getUserCached();
      if (!user) {
        toast.error('Please log in to view orders');
        setLoading(false);
        return;
      }

      // Fetch all orders with aggregated order_items and legacy product
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, transaction_id, status, order_status, amount, currency, user_id, created_at, payment_method, quantity, product_id,
          products!fk_product_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Fetch user profiles for each order
      const ordersWithUserInfo = await Promise.all(
        data.map(async (order: any) => {
          // First try to get from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', order.user_id)
            .single();

          let userName = 'Unknown User';
          let userEmail = 'No email';

          if (!profileError && profileData) {
            userName = profileData.full_name || profileData.email?.split('@')[0] || 'Unknown User';
            userEmail = profileData.email || 'No email';
          } else {
            // Fallback: try to get from auth.users if profiles doesn't work
            try {
              const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
              if (!usersError && users) {
                const authUser = users.find(u => u.id === order.user_id);
                if (authUser) {
                  userName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown User';
                  userEmail = authUser.email || 'No email';
                }
              }
            } catch {
              console.log('Auth users fetch failed, using fallback');
              // Final fallback
              userName = `User ${order.user_id.slice(0, 8)}`;
              userEmail = order.user_id.slice(0, 8);
            }
          }

          // Normalize items with legacy fallback
          const items: OrderItem[] = order.product_id
            ? [
                {
                  product_id: order.product_id,
                  quantity: order.quantity,
                  product_name: order.products?.name || '',
                },
              ]
            : [];

          return {
            id: order.id,
            transaction_id: order.transaction_id,
            status: order.status,
            order_status: order.order_status,
            amount: order.amount,
            currency: order.currency,
            user_id: order.user_id,
            created_at: order.created_at,
            payment_method: order.payment_method,
            items,
            legacy_product_name: order.products?.name,
            legacy_quantity: order.quantity,
            user_name: userName,
            user_email: userEmail,
          } as Order;
        })
      );

      // Fallback: fill missing product names via a single products query
      const missingProductIds = Array.from(new Set(
        ordersWithUserInfo.flatMap((o) => o.items.filter((i) => !i.product_name).map((i) => i.product_id))
      ));

      if (missingProductIds.length > 0) {
        const { data: prodList, error: prodErr } = await supabase
          .from('products')
          .select('id, name')
          .in('id', missingProductIds);

        if (!prodErr && prodList) {
          const nameMap = new Map<string, string>(prodList.map((p: any) => [p.id, p.name]));
          const enrichedOrders = ordersWithUserInfo.map((o) => ({
            ...o,
            items: o.items.map((i) => ({
              ...i,
              product_name: i.product_name || nameMap.get(i.product_id) || i.product_name || '',
            })),
          }));
          setOrders(enrichedOrders);
        } else {
          setOrders(ordersWithUserInfo);
        }
      } else {
        setOrders(ordersWithUserInfo);
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'An unexpected error occurred');
      toast.error(err.message || 'Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: 'pending' | 'success' | 'failed') => {
    try {
      setUpdateLoading(orderId);
      
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders(); // Refresh the list
      setOpenDropdown(null);
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
      console.error('Update error:', error);
    } finally {
      setUpdateLoading(null);
    }
  };

  const handlePaymentStatusChange = async (
    orderId: string,
    newPaymentStatus:
      | 'pending'
      | 'confirmed'
      | 'processing'
      | 'shipped'
      | 'in_transit'
      | 'out_for_delivery'
      | 'delivered'
      | 'return_requested'
      | 'returned'
      | 'cancelled'
      | 'failed_delivery'
  ) => {
    try {
      setUpdateLoading(orderId);
      const { error } = await supabase
        .from('orders')
        .update({ order_status: newPaymentStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Order status updated to ${newPaymentStatus.replace(/_/g, ' ')}`);
      fetchOrders();
      setOpenDropdown(null);
    } catch (error: any) {
      toast.error(`Failed to update order status: ${error.message}`);
      console.error('Update error:', error);
    } finally {
      setUpdateLoading(null);
    }
  };

  const handleDelete = async (orderId: string, transactionId: string) => {
    if (!confirm(`Are you sure you want to delete order "${transactionId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(orderId);
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Order deleted successfully!');
      fetchOrders(); // Refresh the list
      setOpenDropdown(null);
    } catch (error: any) {
      toast.error(`Failed to delete order: ${error.message}`);
      console.error('Delete error:', error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'BDT' ? 'USD' : currency, // Fallback for BDT
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  const formatPaymentStatus = (paymentStatus: string) =>
    paymentStatus
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

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
                      <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      All Orders
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Manage and track all customer orders
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Order History</h2>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{orders.length} orders</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-600">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-6 sm:p-8 text-center">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Error loading orders</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchOrders}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <span>Retry</span>
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-sm text-gray-600">Orders will appear here once customers start purchasing.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View (hidden on mobile) */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          Order
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Payment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 max-w-[80px]">
                            <div className="text-sm font-medium text-gray-900">
                              #{order.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {order.transaction_id}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center min-w-0">
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {order.user_name}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {order.user_email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center min-w-0">
                              <Package className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                              {(() => {
                                const summary = order.items && order.items.length > 0
                                  ? order.items.map(i => `${i.quantity} x ${i.product_name || 'N/A'}`).join(', ')
                                  : (order.legacy_quantity && order.legacy_product_name)
                                    ? `${order.legacy_quantity} x ${order.legacy_product_name}`
                                    : 'N/A';
                                return (
                                  <div className="text-sm text-gray-900 truncate max-w-[220px]" title={summary}>
                                    {summary}
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {formatPrice(order.amount, order.currency)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(order.order_status)}`}>
                              {formatPaymentStatus(order.order_status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-900">
                              {order.payment_method === 'cod' ? 'COD' : order.payment_method === 'online' ? 'Online Payment' : 'N/A'}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(order.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 flex justify-center">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                  const menuWidth = 224; // w-56
                                  const left = Math.max(8, rect.right - menuWidth);
                                  const top = rect.bottom + 4;
                                  if (openDropdown === order.id) {
                                    setOpenDropdown(null);
                                    setMenuPos(null);
                                  } else {
                                    setOpenDropdown(order.id);
                                    setMenuPos({ top, left });
                                  }
                                }}
                                className="inline-flex items-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={updateLoading === order.id || deleteLoading === order.id}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Desktop Actions Menu Portal */}
                {openDropdown && menuPos && (() => {
                  const order = orders.find((o) => o.id === openDropdown);
                  if (!order) return null;
                  return createPortal(
                    <div className="fixed inset-0 z-50">
                      <div
                        className="absolute inset-0"
                        onClick={() => {
                          setOpenDropdown(null);
                          setMenuPos(null);
                        }}
                      />
                      <div
                        className="w-56 bg-white rounded-md shadow-lg border border-gray-200"
                        style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
                      >
                        <div className="py-1">
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                            Change Order Status
                          </div>
                          {[
                            'pending',
                            'confirmed',
                            'processing',
                            'shipped',
                            'in_transit',
                            'out_for_delivery',
                            'delivered',
                            'return_requested',
                            'returned',
                            'cancelled',
                            'failed_delivery',
                          ].map((ps) => (
                            <button
                              key={ps}
                              onClick={() => handlePaymentStatusChange(order.id, ps as any)}
                              disabled={updateLoading === order.id || order.order_status === ps}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              <div className="w-2 h-2 rounded-full mr-2 bg-gray-400"></div>
                              {formatPaymentStatus(ps)}
                              {order.order_status === ps && (
                                <span className="ml-auto text-xs text-gray-400">(Current)</span>
                              )}
                            </button>
                          ))}
                          <div className="border-t border-gray-100 mt-1">
                            <button
                              onClick={() => handleDelete(order.id, order.transaction_id)}
                              disabled={deleteLoading === order.id}
                              className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                              {deleteLoading === order.id ? (
                                <div className="w-4 h-4 mr-2 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash2 className="w-4 h-4 mr-2" />
                              )}
                              Delete Order
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>,
                    document.body
                  );
                })()}

                {/* Mobile & Tablet Card View */}
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 mb-1">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{order.user_name}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-6">{order.user_email}</div>
                      </div>

                      {/* Product and Amount */}
                      <div className="grid grid-cols-1 gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Items:</span>
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
                            {formatPrice(order.amount, order.currency)}
                          </span>
                        </div>
                      </div>

                      {/* Transaction and Date */}
                      <div className="grid grid-cols-1 gap-1 mb-3">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">TXN: {order.transaction_id}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end pt-2 border-t border-gray-100">
                        <div className="relative">
                          <button
                            onClick={() => setOpenDropdown(openDropdown === order.id ? null : order.id)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                            disabled={updateLoading === order.id || deleteLoading === order.id}
                          >
                            Actions
                            <MoreVertical className="w-3 h-3 ml-1" />
                          </button>
                          
                          {openDropdown === order.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                              <div className="py-1">
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                  Change Status
                                </div>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'pending')}
                                  disabled={updateLoading === order.id || order.status === 'pending'}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                                  Pending
                                  {order.status === 'pending' && <span className="ml-auto text-xs text-gray-400">(Current)</span>}
                                </button>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'success')}
                                  disabled={updateLoading === order.id || order.status === 'success'}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  Success
                                  {order.status === 'success' && <span className="ml-auto text-xs text-gray-400">(Current)</span>}
                                </button>
                                <button
                                  onClick={() => handleStatusChange(order.id, 'failed')}
                                  disabled={updateLoading === order.id || order.status === 'failed'}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                  Failed
                                  {order.status === 'failed' && <span className="ml-auto text-xs text-gray-400">(Current)</span>}
                                </button>
                                <div className="border-t border-gray-100 mt-1">
                                  <button
                                    onClick={() => handleDelete(order.id, order.transaction_id)}
                                    disabled={deleteLoading === order.id}
                                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                  >
                                    {deleteLoading === order.id ? (
                                      <div className="w-4 h-4 mr-2 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                      <Trash2 className="w-4 h-4 mr-2" />
                                    )}
                                    Delete Order
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllOrdersPage;
