import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's availability slots
    const { data: mySlots, error: slotsError } = await supabase
      .from('user_availability')
      .select('activity_type, day_of_week, time_slot')
      .eq('user_id', user.id);

    if (slotsError || !mySlots || mySlots.length === 0) {
      return Response.json({ error: 'No availability set. Add your availability first.' }, { status: 400 });
    }

    // Get current user's last known location from their most recent event participation or creation
    const { data: userLastEvent } = await supabase
      .from('events')
      .select('location_lat, location_lng')
      .or(`creator_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let userLat: number | null = null;
    let userLng: number | null = null;

    if (userLastEvent) {
      userLat = userLastEvent.location_lat;
      userLng = userLastEvent.location_lng;
    } else {
      // Try from event_participants
      const { data: participatedEvent } = await supabase
        .from('event_participants')
        .select('event_id')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (participatedEvent) {
        const { data: evtData } = await supabase
          .from('events')
          .select('location_lat, location_lng')
          .eq('id', participatedEvent.event_id)
          .single();

        if (evtData) {
          userLat = evtData.location_lat;
          userLng = evtData.location_lng;
        }
      }
    }

    // Find other users with overlapping availability
    const suggestions: Array<{
      matched_user_id: string;
      activity_type: string;
      day_of_week: number;
      time_slot: string;
      suggested_location: string;
    }> = [];

    for (const slot of mySlots) {
      const { data: matchingUsers, error: matchError } = await supabase
        .from('user_availability')
        .select('user_id')
        .eq('activity_type', slot.activity_type)
        .eq('day_of_week', slot.day_of_week)
        .eq('time_slot', slot.time_slot)
        .neq('user_id', user.id);

      if (matchError || !matchingUsers || matchingUsers.length === 0) continue;

      // Filter by proximity if we have user location
      let nearbyUserIds = matchingUsers.map((m) => m.user_id);

      if (userLat !== null && userLng !== null) {
        // Find users who have events within 10km of current user's location
        const { data: nearbyEvents } = await supabase.rpc('get_nearby_user_ids', {
          ref_lat: userLat,
          ref_lng: userLng,
          radius_km: 10,
          exclude_user_id: user.id,
        });

        if (nearbyEvents && nearbyEvents.length > 0) {
          const nearbySet = new Set(nearbyEvents.map((e: { user_id: string }) => e.user_id));
          nearbyUserIds = nearbyUserIds.filter((uid) => nearbySet.has(uid));
        }
        // If RPC doesn't exist or fails, fall back to just using matching users without proximity filter
      }

      if (nearbyUserIds.length === 0) continue;

      // Find suggested location for this activity type
      let suggestedLocation = 'TBD - agree in chat';

      if (userLat !== null && userLng !== null) {
        const { data: popularLocations } = await supabase.rpc('get_popular_location', {
          p_activity_type: slot.activity_type,
          ref_lat: userLat,
          ref_lng: userLng,
          radius_km: 10,
        });

        if (popularLocations && popularLocations.length > 0) {
          suggestedLocation = popularLocations[0].location_name;
        }
      }

      for (const matchedUserId of nearbyUserIds) {
        suggestions.push({
          matched_user_id: matchedUserId,
          activity_type: slot.activity_type,
          day_of_week: slot.day_of_week,
          time_slot: slot.time_slot,
          suggested_location: suggestedLocation,
        });
      }
    }

    if (suggestions.length === 0) {
      return Response.json({ data: [], message: 'No matches found' });
    }

    // Deduplicate: one suggestion per user per activity+day+time
    const seen = new Set<string>();
    const uniqueSuggestions = suggestions.filter((s) => {
      const key = `${s.matched_user_id}-${s.activity_type}-${s.day_of_week}-${s.time_slot}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Create auto_suggest invitations (skip if already exists)
    const created: Array<Record<string, unknown>> = [];

    for (const suggestion of uniqueSuggestions.slice(0, 10)) { // Limit to 10 suggestions
      // Check if already has a pending auto-suggestion for same match
      const { data: existing } = await supabase
        .from('event_invitations')
        .select('id')
        .eq('invitee_id', suggestion.matched_user_id)
        .eq('inviter_id', user.id)
        .eq('type', 'auto_suggest')
        .eq('suggested_activity', suggestion.activity_type)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) continue;

      // Map time_slot to rough time
      const timeMap: Record<string, string> = {
        morning: '8:00 AM - 12:00 PM',
        afternoon: '12:00 PM - 5:00 PM',
        evening: '5:00 PM - 10:00 PM',
      };

      const { data: invitation, error: insertError } = await supabase
        .from('event_invitations')
        .insert({
          event_id: null,
          inviter_id: user.id,
          invitee_id: suggestion.matched_user_id,
          type: 'auto_suggest',
          status: 'pending',
          message: null,
          suggested_location: suggestion.suggested_location,
          suggested_activity: suggestion.activity_type,
          suggested_time: timeMap[suggestion.time_slot] || suggestion.time_slot,
        })
        .select('id, invitee_id, type, suggested_activity, suggested_location, suggested_time, created_at')
        .single();

      if (!insertError && invitation) {
        created.push(invitation);
      }
    }

    // Also create invitations where the current user is the invitee (others matching them)
    // Find users who have availability matching the current user
    for (const slot of mySlots) {
      const { data: inviters } = await supabase
        .from('user_availability')
        .select('user_id')
        .eq('activity_type', slot.activity_type)
        .eq('day_of_week', slot.day_of_week)
        .eq('time_slot', slot.time_slot)
        .neq('user_id', user.id);

      if (!inviters || inviters.length === 0) continue;

      for (const inviter of inviters.slice(0, 5)) {
        // Check if already has a pending auto-suggestion from this user
        const { data: existing } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('invitee_id', user.id)
          .eq('inviter_id', inviter.user_id)
          .eq('type', 'auto_suggest')
          .eq('suggested_activity', slot.activity_type)
          .eq('status', 'pending')
          .maybeSingle();

        if (existing) continue;

        let suggestedLocation = 'TBD - agree in chat';
        if (userLat !== null && userLng !== null) {
          const { data: popularLocations } = await supabase.rpc('get_popular_location', {
            p_activity_type: slot.activity_type,
            ref_lat: userLat,
            ref_lng: userLng,
            radius_km: 10,
          });
          if (popularLocations && popularLocations.length > 0) {
            suggestedLocation = popularLocations[0].location_name;
          }
        }

        const timeMap: Record<string, string> = {
          morning: '8:00 AM - 12:00 PM',
          afternoon: '12:00 PM - 5:00 PM',
          evening: '5:00 PM - 10:00 PM',
        };

        const { data: invitation, error: insertError } = await supabase
          .from('event_invitations')
          .insert({
            event_id: null,
            inviter_id: inviter.user_id,
            invitee_id: user.id,
            type: 'auto_suggest',
            status: 'pending',
            message: null,
            suggested_location: suggestedLocation,
            suggested_activity: slot.activity_type,
            suggested_time: timeMap[slot.time_slot] || slot.time_slot,
          })
          .select('id, invitee_id, type, suggested_activity, suggested_location, suggested_time, created_at')
          .single();

        if (!insertError && invitation) {
          created.push(invitation);
        }
      }
    }

    return Response.json({
      data: created,
      message: `Found ${created.length} match${created.length === 1 ? '' : 'es'}!`,
    });
  } catch (error) {
    console.error('Error in auto-match:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
