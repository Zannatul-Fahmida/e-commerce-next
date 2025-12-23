'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logo2 from '@/public/assets/logo-2.png';
import { ArrowLeft, LogIn } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
        return;
      }
      setIsLoading(false);
    };
    checkSession();
  }, []);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Logged in successfully!');
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50/60 to-secondary-50/60 px-4">
      <div className="text-center text-gray-600">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50/60 to-secondary-50/60 px-4 relative">
      <Toaster richColors />
      <div className="absolute top-4 left-4">
        <Link href="/" className="inline-flex items-center">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
      <div className="w-full max-w-[560px] mx-auto bg-white p-8 rounded-2xl shadow-lg border">
        <div className="flex justify-center mb-4">
          <Image src={logo2} alt="Prinon" className="h-16 w-auto" priority />
        </div>
        <h1 className="text-3xl font-semibold text-center text-primary-700 mb-2">Welcome Back</h1>
        <p className="text-center text-sm text-gray-600 mb-6">Sign in to continue to your account</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                  <div className="text-right">
                    <Link
                      href="/forgot-password"
                      className="text-sm text-primary-600 font-medium hover:underline"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gap-2" disabled={form.formState.isSubmitting || isLoading}>
              {form.formState.isSubmitting || isLoading ? 'Logging in...' : (
                <>
                  <LogIn className="w-4 h-4" />
                  Log In
                </>
              )}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center text-gray-600 mt-4">
          Don’t have an account?{' '}
          <Link href="/signup" className="text-primary-600 font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
