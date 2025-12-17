/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect } from 'react';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import DashboardNavbar from '@/components/dashboard/DashboardNavbar';
import { Trash2, Search, Filter, Menu, Users, User, Mail, Calendar, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string | null;
  phone?: string | null;
}

export default function AllUsersPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleToggle = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Check if user is logged in and an admin
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('Please log in to view users');
        setLoading(false);
        return;
      }

      // Fetch all profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleteLoading(userId);

      // Call the database function via RPC
      const { data, error } = await supabase.rpc('delete_user_from_profiles', {
        target_user_id: userId
      });

      if (error) {
        throw error;
      }

      // Check the function result
      if (!data.success) {
        throw new Error(data.error);
      }

      // Remove user from state
      setUsers(users.filter(user => user.id !== userId));
      
      // Show appropriate success message
      if (data.auth_cleanup_needed) {
        toast.success(`User "${userName}" has been deleted from profiles. Auth cleanup may be needed.`);
      } else {
        toast.success(`User "${userName}" has been deleted successfully`);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'customer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                      All Users
                    </h1>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Manage all registered users in the system
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-lg shadow border border-gray-200">
            <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">User Management</h2>
                <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{filteredUsers.length} users</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-600">Loading users...</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            No users found matching your criteria
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                    <User className="h-5 w-5 text-primary-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.full_name || 'No name'}
                                  </div>
                                  <div className="text-sm text-gray-500">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.phone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(user.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                disabled={user.role === 'admin' || deleteLoading === user.id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={user.role === 'admin' ? 'Cannot delete admin users' : 'Delete user'}
                              >
                                {deleteLoading === user.id ? (
                                  <div className="w-4 h-4 mr-1 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4 mr-1" />
                                )}
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile & Tablet Card View */}
                <div className="lg:hidden">
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        No users found matching your criteria
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-3">
                            {/* User Avatar */}
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary-600" />
                              </div>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {user.full_name || 'No name'}
                                  </h3>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Mail className="w-3 h-3 text-gray-400" />
                                    <span className="text-sm text-gray-600 truncate">
                                      {user.email}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Shield className="w-3 h-3 text-gray-400" />
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                      {user.role}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 mt-1">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-500">
                                      Created: {formatDate(user.created_at)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Mobile Actions */}
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                  disabled={user.role === 'admin' || deleteLoading === user.id}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  title={user.role === 'admin' ? 'Cannot delete admin users' : 'Delete user'}
                                >
                                  {deleteLoading === user.id ? (
                                    <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Total Users</div>
              <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Admin Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="text-sm font-medium text-gray-500">Customer Users</div>
              <div className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'customer').length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
