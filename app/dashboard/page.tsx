'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserCached } from '@/lib/supabase';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const DashboardPage = () => {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        // Get the current user from Supabase auth
        const { data: { user }, error: authError } = await getUserCached();

        if (authError || !user) {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (role === 'admin' || role === 'customer') {
    return <DashboardLayout userRole={role} />;
  } else {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid role. Please contact support.</p>
      </div>
    );
  }
};

export default DashboardPage;
