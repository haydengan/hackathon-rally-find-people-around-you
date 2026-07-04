'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ProfileForm } from '@/components/ProfileForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAvatarUrl(user.user_metadata?.avatar_url ?? null);
        setDisplayName(
          user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            ''
        );
      }
      setLoading(false);
    }

    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center">
            <Skeleton className="size-20 rounded-full" />
            <Skeleton className="mt-2 h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 mesh-gradient">
      <Card className="w-full max-w-md shadow-vibrant border-0 overflow-hidden">
        {/* Colorful top gradient */}
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <CardHeader className="items-center text-center pt-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25">
              <MapPin className="size-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Rally</span>
          </div>

          <Avatar className="size-20 ring-4 ring-indigo-100">
            <AvatarImage src={avatarUrl ?? undefined} alt="Profile avatar" />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold">
              {displayName?.charAt(0)?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>

          <CardTitle className="mt-3 text-xl">Set up your profile ✨</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tell people a bit about yourself and what you like to do
          </p>
        </CardHeader>

        <CardContent>
          <ProfileForm
            mode="create"
            onSuccess={() => router.push('/availability')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
