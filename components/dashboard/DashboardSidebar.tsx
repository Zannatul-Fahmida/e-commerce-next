import { Eye, Package, ShoppingCart, X, Home, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userRole?: string;
}

export const DashboardSidebar = ({ isOpen, onToggle, userRole }: DashboardSidebarProps) => {
  const pathname = usePathname();

  // Define menu items based on user role
  const getMenuItems = () => {
    const commonItems = [
      {
        href: '/dashboard',
        label: 'Dashboard',
        icon: Home,
      },
    ];

    if (userRole === 'customer') {
      return [
        ...commonItems,
        {
          href: '/dashboard/my-orders',
          label: 'My Orders',
          icon: ShoppingCart,
        },
        {
          href: '/dashboard/profile',
          label: 'Profile',
          icon: Users,
        },
      ];
    }

    // Admin menu items (default)
    return [
      ...commonItems,
      {
        href: '/dashboard/view-categories',
        label: 'View Categories',
        icon: Eye,
      },
      {
        href: '/dashboard/view-products',
        label: 'View Products',
        icon: Package,
      },
      {
        href: '/dashboard/all-orders',
        label: 'All Orders',
        icon: ShoppingCart,
      },
      {
        href: '/dashboard/all-users',
        label: 'All Users',
        icon: Users,
      },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <div
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center justify-center w-full">
          <Link href="/">
            <Image
              src="/assets/logo-2.png"
              alt="Prinon"
              width={70}
              height={70}
              className="object-contain"
            />
          </Link>
        </div>
        <button 
          onClick={onToggle} 
          className="lg:hidden p-1 hover:bg-gray-100 rounded-md transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 border border-primary-200'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} {userRole === 'customer' ? 'Customer' : 'Admin'} Dashboard
        </div>
      </div>
    </div>
  );
};
