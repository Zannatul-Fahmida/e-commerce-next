/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast, Toaster } from 'sonner';
import { Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import logo2 from '@/public/assets/logo-2.png';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasSession, setHasSession] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
          return;
        }
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            setHasSession(true);
          } else {
            toast.error(error.message);
          }
        }
      } catch (e: any) {
        toast.error('Failed to initialize reset session: ' + e.message);
      } finally {
        setInitializing(false);
      }
    };
    init();
  }, [searchParams]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!hasSession) {
        toast.error('Open the password reset link from your email to continue');
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Password updated successfully!');
      setTimeout(() => router.push('/login'), 2000);
    } catch (err) {
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto bg-white p-8 rounded-2xl shadow-lg border">
      <div className="flex justify-center mb-4">
        <Image src={logo2} alt="Prinon" className="h-16 w-auto" priority />
      </div>
      <h1 className="text-3xl font-semibold text-center text-primary-700 mb-2">Set New Password</h1>
      {!initializing && !hasSession && (
        <div className="text-sm text-red-600 mb-4">
          Open the password reset link from your email to access this page.
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="********" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !hasSession || initializing}>
            {form.formState.isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <Suspense fallback={<div className="text-center text-gray-600">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

export const dynamic = 'force-dynamic';
