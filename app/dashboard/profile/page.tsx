'use client';

import { useEffect, useState, useRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { supabase, getUserCached } from '@/lib/supabase';
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
import { v4 as uuidv4 } from 'uuid';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  username: z.string(),
  email: z.string().email(),
  avatar: z.any().optional(),
  bio: z.string().max(500, 'Bio must be 500 characters or less').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [avatarPublicUrl, setAvatarPublicUrl] = useState<string>('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      username: '',
      email: '',
      avatar: undefined,
      bio: '',
    },
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authError } = await getUserCached();
        if (authError || !user) {
          toast.error('Please log in to access your profile');
          router.push('/login');
          return;
        }
        const { data: roleRow, error: roleError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (roleError || !roleRow) {
          toast.error('Failed to fetch user role');
          router.push('/login');
          return;
        }
        setUserRole(roleRow.role);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url, email, bio')
          .eq('id', user.id)
          .single();
        if (error || !profile) {
          toast.error('Failed to load profile');
          return;
        }
        form.reset({
          full_name: profile.full_name || '',
          username: profile.username || '',
          email: profile.email || '',
          avatar: undefined,
          bio: profile.bio || '',
        });
        setAvatarPreview(profile.avatar_url || '');
        setAvatarPublicUrl(profile.avatar_url || '');
      } catch (e) {
        console.error(e);
        toast.error('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Session expired. Please log in again.');
        router.push('/login');
        return;
      }

      let newAvatarUrl: string | null = null;
      if (avatarFile) {
        if (!avatarFile.type.startsWith('image/')) {
          toast.error('Invalid image file');
          return;
        }
        if (avatarFile.size > 5 * 1024 * 1024) {
          toast.error('Image is too large');
          return;
        }
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${user.id}/${uuidv4()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
        if (uploadError) {
          toast.error('Failed to upload avatar');
          return;
        }
        const { data: publicData } = await supabase.storage.from('avatars').getPublicUrl(path);
        newAvatarUrl = publicData?.publicUrl || null;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: values.full_name,
          avatar_url: newAvatarUrl ?? undefined,
        })
        .eq('id', user.id);

      if (updateError) {
        const msg = updateError.message || '';
        if (msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
          toast.error('Username is already taken');
        } else {
          toast.error('Failed to update profile');
        }
        return;
      }

      await supabase.auth.updateUser({
        data: { full_name: values.full_name },
      });

      if (typeof values.bio !== 'undefined') {
        try {
          await supabase
            .from('profiles')
            .update({ bio: values.bio || null })
            .eq('id', user.id);
        } catch {}
      }

      if (newAvatarUrl) {
        setAvatarPreview(newAvatarUrl);
        setAvatarPublicUrl(newAvatarUrl);
        setAvatarFile(null);
      }
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !userRole) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Session expired. Please log in again.');
        router.push('/login');
        return;
      }
      if (!avatarPublicUrl) {
        setAvatarFile(null);
        setAvatarPreview('');
        toast.success('Profile image removed');
      } else {
        let storagePath = '';
        try {
          const url = new URL(avatarPublicUrl);
          const prefix = '/storage/v1/object/public/avatars/';
          if (url.pathname.startsWith(prefix)) {
            storagePath = url.pathname.slice(prefix.length);
          }
        } catch {}
        if (storagePath) {
          await supabase.storage.from('avatars').remove([storagePath]);
        }
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user.id);
        if (updateError) {
          toast.error('Failed to remove avatar');
          return;
        }
        setAvatarFile(null);
        setAvatarPreview('');
        setAvatarPublicUrl('');
        toast.success('Profile image removed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout userRole={userRole || undefined} hideStats>
      <div className="max-w-3xl mx-auto bg-white p-4 md:p-8 rounded-2xl border shadow-lg">
        <h2 className="text-2xl font-semibold mb-2">My Profile</h2>
        <p className="text-sm text-gray-600 mb-8">Update your personal information</p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="md:space-y-8 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAvatarFile(f);
                    if (f) {
                      const url = URL.createObjectURL(f);
                      setAvatarPreview(url);
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={handleUploadClick}>
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleRemoveAvatar}
                    disabled={!avatarPreview && !avatarPublicUrl}
                  >
                    Remove
                  </Button>
                </div>
                <p className="text-xs md:text-start text-center text-gray-500 mt-2">PNG or JPG, up to 5MB.</p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter your email" {...field} readOnly className='text-sm md:text-base' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Enter your name" {...field} className='text-sm md:text-base' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="john123" {...field} readOnly className='text-sm md:text-base' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <textarea
                      rows={4}
                      placeholder="Tell others about you"
                      className="resize-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 text-sm md:text-base focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
