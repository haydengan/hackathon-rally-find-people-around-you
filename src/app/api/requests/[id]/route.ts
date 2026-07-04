import { createClient } from '@/lib/supabase/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the request with creator profile
    const { data: rallyRequest, error } = await supabase
      .from('rally_requests')
      .select(`
        id, user_id, activity_type, description, time_range, radius_km,
        location_lat, location_lng, min_people, status, created_at, expires_at,
        creator:profiles!rally_requests_user_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('id', id)
      .single();

    if (error || !rallyRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    // Fetch hands with profiles
    const { data: hands } = await supabase
      .from('rally_request_hands')
      .select(`
        id, request_id, user_id, created_at,
        profile:profiles!rally_request_hands_user_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('request_id', id)
      .order('created_at', { ascending: true });

    // Check if current user raised hand
    const userRaisedHand = (hands ?? []).some((h) => h.user_id === user.id);

    const transformed = {
      ...rallyRequest,
      location: { lat: rallyRequest.location_lat, lng: rallyRequest.location_lng },
      hand_count: hands?.length ?? 0,
      user_raised_hand: userRaisedHand,
      hands: hands ?? [],
    };

    return Response.json({ data: transformed });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
