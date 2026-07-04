import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const activityType = url.searchParams.get('activity_type');
    const tab = url.searchParams.get('tab') || 'joined'; // 'joined' or 'created'
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const now = new Date().toISOString();

    if (tab === 'created') {
      // Events the user created that are in the past
      let query = supabase
        .from('events')
        .select(`
          id, creator_id, title, description, activity_type, skill_level,
          location_name, location_lat, location_lng, starts_at, total_spots,
          spots_taken, cost_per_person, is_now, status, created_at
        `, { count: 'exact' })
        .eq('creator_id', user.id)
        .lt('starts_at', now)
        .order('starts_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      const { data: events, error, count } = await query;

      if (error) {
        console.error('Error fetching created events history:', error);
        return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
      }

      const eventsWithRole = (events ?? []).map((event) => ({
        ...event,
        role: 'creator' as const,
      }));

      return Response.json({
        data: eventsWithRole,
        total: count ?? 0,
        limit,
        offset,
      });
    } else {
      // Events the user participated in (not as creator) that are in the past
      let query = supabase
        .from('event_participants')
        .select(`
          event_id, attended, joined_at,
          event:events!event_participants_event_id_fkey(
            id, creator_id, title, description, activity_type, skill_level,
            location_name, location_lat, location_lng, starts_at, total_spots,
            spots_taken, cost_per_person, is_now, status, created_at
          )
        `, { count: 'exact' })
        .eq('user_id', user.id)
        .lt('event.starts_at', now)
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (activityType) {
        query = query.eq('event.activity_type', activityType);
      }

      const { data: participations, error, count } = await query;

      if (error) {
        console.error('Error fetching joined events history:', error);
        return Response.json({ error: 'Failed to fetch history' }, { status: 500 });
      }

      // Flatten the results and filter out null events
      const eventsWithRole = (participations ?? [])
        .filter((p) => p.event !== null)
        .map((p) => {
          const event = p.event as unknown as { creator_id: string; [key: string]: unknown };
          return {
            ...event,
            attended: p.attended,
            role: event.creator_id === user.id ? 'creator' : 'participant',
          };
        });

      return Response.json({
        data: eventsWithRole,
        total: count ?? 0,
        limit,
        offset,
      });
    }
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
