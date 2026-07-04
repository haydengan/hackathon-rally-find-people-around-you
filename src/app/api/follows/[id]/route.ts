import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user follows this user
    const { data: followingThem } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .single();

    // Check if this user follows current user
    const { data: followingMe } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', id)
      .eq('following_id', user.id)
      .single();

    // Get follower/following counts for the target user
    const { count: followersCount } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', id);

    const { count: followingCount } = await supabase
      .from('follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', id);

    return Response.json({
      data: {
        is_following: !!followingThem,
        follows_back: !!followingMe,
        is_mutual: !!followingThem && !!followingMe,
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0,
      },
    });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
