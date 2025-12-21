import { useState, useEffect } from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { Menu, Users, Package, ShoppingCart } from 'lucide-react';
import DashboardNavbar from './DashboardNavbar';
import StatsCard from './StatsCard';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface DashboardLayoutProps {
  userRole?: string;
  children?: React.ReactNode;
  hideStats?: boolean;
}

const DashboardLayout = ({ userRole, children, hideStats = false }: DashboardLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    orders: 0
  });
  const [loading, setLoading] = useState(true);

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      if (userRole === 'customer') {
        // For customers, only fetch their own orders count
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { count } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          
          setStats({
            users: 0,
            products: 0,
            orders: count || 0
          });
        }
      } else {
        // For admins, fetch all counts
        const [usersResult, productsResult, ordersResult] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('*', { count: 'exact', head: true })
        ]);

        setStats({
          users: usersResult.count || 0,
          products: productsResult.count || 0,
          orders: ordersResult.count || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <DashboardSidebar isOpen={isSidebarOpen} onToggle={handleToggle} userRole={userRole} />
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <DashboardNavbar />
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <button
              onClick={handleToggle}
              className="p-2 bg-primary text-white rounded"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>
          
          {/* Stats Cards - Show different stats based on role */}
          {!hideStats && (
            <>
              {userRole === 'customer' ? (
                <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
                  <StatsCard
                    title="My Orders"
                    count={stats.orders}
                    icon={ShoppingCart}
                    loading={loading}
                    iconColor="text-purple-600"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <StatsCard
                    title="Total Users"
                    count={stats.users}
                    icon={Users}
                    loading={loading}
                    iconColor="text-blue-600"
                  />
                  <StatsCard
                    title="Total Products"
                    count={stats.products}
                    icon={Package}
                    loading={loading}
                    iconColor="text-green-600"
                  />
                  <StatsCard
                    title="Total Orders"
                    count={stats.orders}
                    icon={ShoppingCart}
                    loading={loading}
                    iconColor="text-purple-600"
                  />
                </div>
              )}
            </>
          )}

          {/* Render children if provided, otherwise show default content */}
          {children || (
            <div>
              {/* Add your other dashboard content here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;