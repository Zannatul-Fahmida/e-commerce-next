'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import Image from 'next/image';

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
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import logo2 from '@/public/assets/logo-2.png';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Minimum 6 characters required' }),
});

export default function SignupPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: values.email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: values.full_name,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      try {
        sessionStorage.setItem(`signup:${values.email}:full_name`, values.full_name);
        sessionStorage.setItem(`signup:${values.email}:password`, values.password);
      } catch {}
      toast.success('A 6-digit verification code has been sent to your email.');
      router.push(`/verify?email=${encodeURIComponent(values.email)}`);
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error(err);
    }
  };

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
        <h1 className="text-3xl font-semibold text-center text-primary-700 mb-2">Create an Account</h1>
        <p className="text-center text-sm text-gray-600 mb-6">Start your journey with us</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
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
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing up...' : 'Sign Up'}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
