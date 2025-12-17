'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';

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
import Image from 'next/image';
import logo2 from '@/public/assets/logo-2.png';
import { ArrowLeft } from 'lucide-react';

// Force dynamic rendering to avoid prerendering issues
export const dynamic = 'force-dynamic';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
});

export default function ForgotPasswordPage() {
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : 'https://your-app-domain.com/reset-password',
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password reset email sent! Please check your inbox.');
      setTimeout(() => router.push('/login'), 2000);
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
        <h1 className="text-3xl font-semibold text-center text-primary-700 mb-2">Reset Your Password</h1>
        <p className="text-center text-sm text-gray-600 mb-6">
          Enter your email address to receive a password reset link.
        </p>

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

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>
        </Form>

        <p className="text-sm text-center text-gray-600 mt-4">
          Remembered your password?{' '}
          <Link href="/login" className="text-primary-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}