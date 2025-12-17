'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Suspense } from 'react';

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

export const dynamic = 'force-dynamic';

const formSchema = z.object({
  code: z.string().min(6, { message: 'Verification code must be 6 characters' }).max(6),
});

async function generateUniqueUsername(fullName: string, email: string) {
  const local = email.split('@')[0] || '';
  const baseRaw = fullName || local;
  const baseClean = (baseRaw || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const base = baseClean || 'user';
  let candidate = base.slice(0, 16);
  for (let i = 0; i < 3; i++) {
    const { data } = await supabase.from('profiles').select('id').eq('username', candidate).limit(1);
    if (!data || data.length === 0) {
      return candidate;
    }
    const suffix = Math.floor(1000 + Math.random() * 9000).toString();
    candidate = `${base}${suffix}`.slice(0, 24);
  }
  return `${base}${Date.now().toString().slice(-5)}`.slice(0, 24);
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!email) {
      toast.error('Email is missing. Please sign up again.');
      router.push('/signup');
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: values.code,
        type: 'email',
      });

      if (error) {
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          toast.error('The verification code is invalid or has expired. Please request a new code.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      try {
        const fullName = sessionStorage.getItem(`signup:${email}:full_name`) || '';
        const password = sessionStorage.getItem(`signup:${email}:password`) || '';
        if (password) {
          const { error: updateError } = await supabase.auth.updateUser({
            password,
            data: fullName ? { full_name: fullName } : undefined,
          });
          if (updateError) {
            toast.error(updateError.message);
            return;
          }
        }
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (userId) {
          const username = await generateUniqueUsername(fullName, email);
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              full_name: fullName,
              email,
              username,
              created_at: new Date().toISOString(),
            });
          if (profileError) {
            toast.error('Failed to save profile information');
            return;
          }
        }
      } catch {}
      try {
        sessionStorage.removeItem(`signup:${email}:full_name`);
        sessionStorage.removeItem(`signup:${email}:password`);
      } catch {}
      toast.success('Email verified successfully!');
      router.push('/');
    } catch (err) {
      toast.error('An unexpected error occurred. Please try again.');
      console.error(err);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is missing. Please sign up again.');
      router.push('/signup');
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('A new 6-digit code has been sent to your email.');
    } catch (err) {
      toast.error('Failed to resend code. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-[560px] mx-auto bg-white p-8 rounded-2xl shadow-lg border">
      <div className="flex justify-center mb-4">
        <Image src={logo2} alt="Prinon" className="h-16 w-auto" priority />
      </div>
      <h1 className="text-3xl font-semibold text-center text-primary-700 mb-2">Verify Your Email</h1>
      <p className="text-center text-sm text-gray-600 mb-6">
        A 6-digit code was sent to <span className="font-medium text-primary-600">{email || 'your email'}</span>.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Code</FormLabel>
                <FormControl>
                  <Input type="text" placeholder="123456" maxLength={6} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </Form>

      <p className="text-sm text-center text-gray-600 mt-4">
        Didn’t receive a code?{' '}
        <button
          onClick={handleResend}
          className="text-primary-600 font-medium hover:underline cursor-pointer"
          disabled={form.formState.isSubmitting}
        >
          Resend code
        </button>{' '}
        or{' '}
        <Link href="/signup" className="text-primary-600 font-medium hover:underline cursor-pointer">
          Try signing up again
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
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
        <VerifyForm />
      </Suspense>
    </div>
  );
}
