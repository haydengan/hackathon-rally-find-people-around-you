import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const followSchema = z.object({
  following_id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get users the current user follows
    const { data: following, error: followingError } = await supabase
      .from('follows')
      .select(`
        following_id,
        profile:profiles!follows_following_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('follower_id', user.id);

    if (followingError) {
      console.error('Error fetching following:', followingError);
      return Response.json({ error: 'Failed to fetch following' }, { status: 500 });
    }

    // Get users who follow the current user
    const { data: followers, error: followersError } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profile:profiles!follows_follower_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('following_id', user.id);

    if (followersError) {
      console.error('Error fetching followers:', followersError);
      return Response.json({ error: 'Failed to fetch followers' }, { status: 500 });
    }

    return Response.json({
      data: {
        following: following ?? [],
        followers: followers ?? [],
        following_count: following?.length ?? 0,
        followers_count: followers?.length ?? 0,
      },
    });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = followSchema.parse(body);

    // Cannot follow yourself
    if (validated.following_id === user.id) {
      return Response.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    // Check if already following
    const { data: existing } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', validated.following_id)
      .single();

    if (existing) {
      return Response.json({ error: 'Already following this user' }, { status: 400 });
    }

    // Insert follow
    const { error: insertError } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: validated.following_id,
      });

    if (insertError) {
      console.error('Error following user:', insertError);
      return Response.json({ error: 'Failed to follow user' }, { status: 500 });
    }

    return Response.json({ message: 'Followed successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = followSchema.parse(body);

    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', validated.following_id);

    if (deleteError) {
      console.error('Error unfollowing user:', deleteError);
      return Response.json({ error: 'Failed to unfollow user' }, { status: 500 });
    }

    return Response.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
