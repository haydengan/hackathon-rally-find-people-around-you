import { createClient } from '@/lib/supabase/server';
import { rallyRequestSchema } from '@/lib/validations/rally-request';
import { z } from 'zod';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch active, non-expired requests with creator profile
    const { data: requests, error } = await supabase
      .from('rally_requests')
      .select(`
        id, user_id, activity_type, description, time_range, radius_km,
        location_lat, location_lng, min_people, status, created_at, expires_at,
        creator:profiles!rally_requests_user_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching rally requests:', error);
      return Response.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Get hand counts for all requests
    const requestIds = (requests ?? []).map((r) => r.id);
    let handCounts: Record<string, number> = {};
    let userHands: Set<string> = new Set();

    if (requestIds.length > 0) {
      // Get counts
      const { data: hands } = await supabase
        .from('rally_request_hands')
        .select('request_id')
        .in('request_id', requestIds);

      if (hands) {
        handCounts = hands.reduce((acc, h) => {
          acc[h.request_id] = (acc[h.request_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }

      // Get current user's hands
      const { data: myHands } = await supabase
        .from('rally_request_hands')
        .select('request_id')
        .eq('user_id', user.id)
        .in('request_id', requestIds);

      if (myHands) {
        userHands = new Set(myHands.map((h) => h.request_id));
      }
    }

    // Transform to include location object and counts
    const transformed = (requests ?? []).map((req) => ({
      ...req,
      location: { lat: req.location_lat, lng: req.location_lng },
      hand_count: handCounts[req.id] || 0,
      user_raised_hand: userHands.has(req.id),
    }));

    return Response.json({ data: transformed });
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
    const validated = rallyRequestSchema.parse(body);

    // Set expires_at to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data: rallyRequest, error: insertError } = await supabase
      .from('rally_requests')
      .insert({
        user_id: user.id,
        activity_type: validated.activity_type,
        description: validated.description || null,
        time_range: validated.time_range,
        radius_km: validated.radius_km,
        location: `POINT(${validated.location_lng} ${validated.location_lat})`,
        location_lat: validated.location_lat,
        location_lng: validated.location_lng,
        min_people: validated.min_people,
        status: 'active',
        expires_at: expiresAt.toISOString(),
      })
      .select('id, user_id, activity_type, description, time_range, radius_km, location_lat, location_lng, min_people, status, created_at, expires_at')
      .single();

    if (insertError || !rallyRequest) {
      console.error('Error creating rally request:', insertError);
      return Response.json({ error: 'Failed to create request' }, { status: 500 });
    }

    // AUTO-MATCH: Find users with matching availability and notify them
    // Parse day_of_week from time_range (e.g. "Monday evening" → day 0, slot evening)
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeSlots = ['morning', 'afternoon', 'evening'];
    const timeRangeLower = validated.time_range.toLowerCase();

    let matchedDay: number | null = null;
    let matchedSlot: string | null = null;

    for (let i = 0; i < dayNames.length; i++) {
      if (timeRangeLower.includes(dayNames[i]) || timeRangeLower.includes(dayNames[i].slice(0, 3))) {
        matchedDay = i;
        break;
      }
    }
    // Also check "today", "tonight", "tomorrow"
    const today = new Date().getDay();
    const todayMondayBased = today === 0 ? 6 : today - 1; // Convert Sun=0 to Mon=0
    if (timeRangeLower.includes('today') || timeRangeLower.includes('tonight')) {
      matchedDay = todayMondayBased;
    } else if (timeRangeLower.includes('tomorrow')) {
      matchedDay = (todayMondayBased + 1) % 7;
    }

    for (const slot of timeSlots) {
      if (timeRangeLower.includes(slot)) {
        matchedSlot = slot;
        break;
      }
    }
    // Infer from keywords
    if (!matchedSlot) {
      if (timeRangeLower.includes('night') || timeRangeLower.includes('pm') || timeRangeLower.includes('evening')) {
        matchedSlot = 'evening';
      } else if (timeRangeLower.includes('afternoon') || timeRangeLower.includes('lunch')) {
        matchedSlot = 'afternoon';
      } else if (timeRangeLower.includes('morning') || timeRangeLower.includes('am')) {
        matchedSlot = 'morning';
      }
    }

    // If we could parse a day, find matching users from user_availability
    if (matchedDay !== null) {
      let availabilityQuery = supabase
        .from('user_availability')
        .select('user_id')
        .eq('activity_type', validated.activity_type)
        .eq('day_of_week', matchedDay)
        .neq('user_id', user.id);

      if (matchedSlot) {
        availabilityQuery = availabilityQuery.eq('time_slot', matchedSlot);
      }

      const { data: matchedUsers } = await availabilityQuery;

      if (matchedUsers && matchedUsers.length > 0) {
        // Send notifications to matched users about this request
        const notifications = matchedUsers.slice(0, 20).map((m) => ({
          user_id: m.user_id,
          type: 'now_nearby' as const,
          title: `Someone wants to ${validated.activity_type} near you!`,
          body: `${validated.time_range} — within ${validated.radius_km}km. Raise your hand!`,
          metadata: { request_id: rallyRequest.id },
          read: false,
        }));

        await supabase.from('notifications').insert(notifications);
      }
    }

    return Response.json({ data: rallyRequest, auto_matched: matchedDay !== null }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
