import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const addSlotSchema = z.object({
  activity_type: z.string().min(1),
  day_of_week: z.number().min(0).max(6),
  time_slot: z.string().min(1),
  max_travel_km: z.number().min(1).max(50).optional(),
  min_people: z.number().min(2).max(20).optional(),
  recurrence: z.enum(['weekly', 'this_week', 'specific']).optional(),
});

const deleteSlotSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: slots, error } = await supabase
      .from('user_availability')
      .select('id, activity_type, day_of_week, time_slot, max_travel_km, min_people, recurrence')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching availability:', error);
      return Response.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    return Response.json({ data: slots });
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
    const validated = addSlotSchema.parse(body);

    // Check for duplicate
    const { data: existing } = await supabase
      .from('user_availability')
      .select('id')
      .eq('user_id', user.id)
      .eq('activity_type', validated.activity_type)
      .eq('day_of_week', validated.day_of_week)
      .eq('time_slot', validated.time_slot)
      .maybeSingle();

    if (existing) {
      return Response.json({ error: 'Slot already exists' }, { status: 409 });
    }

    const { data: slot, error } = await supabase
      .from('user_availability')
      .insert({
        user_id: user.id,
        activity_type: validated.activity_type,
        day_of_week: validated.day_of_week,
        time_slot: validated.time_slot,
        max_travel_km: validated.max_travel_km ?? 5,
        min_people: validated.min_people ?? 2,
        recurrence: validated.recurrence ?? 'weekly',
      })
      .select('id, activity_type, day_of_week, time_slot, max_travel_km, min_people, recurrence')
      .single();

    if (error) {
      console.error('Error adding availability slot:', error);
      return Response.json({ error: 'Failed to add slot' }, { status: 500 });
    }

    // --- AUTO-MATCH: Try to create an event if enough people match ---
    await tryAutoMatch(supabase, user.id, validated.activity_type, validated.day_of_week, validated.time_slot, validated.max_travel_km ?? 5, validated.min_people ?? 2);

    return Response.json({ data: slot }, { status: 201 });
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
    const validated = deleteSlotSchema.parse(body);

    const { error } = await supabase
      .from('user_availability')
      .delete()
      .eq('id', validated.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting availability slot:', error);
      return Response.json({ error: 'Failed to delete slot' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---- Auto-Match Logic ----
// When a user saves availability, check if enough other users overlap.
// If yes → auto-create a public event and send invitations.

async function tryAutoMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  activityType: string,
  dayOfWeek: number,
  timeSlot: string,
  maxTravelKm: number,
  minPeople: number
) {
  try {
    // Find other users with same activity + day + time slot
    const { data: matchingSlots } = await supabase
      .from('user_availability')
      .select('user_id, max_travel_km, min_people')
      .eq('activity_type', activityType)
      .eq('day_of_week', dayOfWeek)
      .eq('time_slot', timeSlot)
      .neq('user_id', userId);

    if (!matchingSlots || matchingSlots.length === 0) return;

    // Get current user's location (from profile or their most recent event)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('last_location_lat, last_location_lng')
      .eq('id', userId)
      .single();

    let userLat: number | null = userProfile?.last_location_lat ?? null;
    let userLng: number | null = userProfile?.last_location_lng ?? null;

    // Fallback to last event location if profile location not set
    if (!userLat || !userLng) {
      const { data: userEvent } = await supabase
        .from('events')
        .select('location_lat, location_lng')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (userEvent?.location_lat && userEvent?.location_lng) {
        userLat = userEvent.location_lat;
        userLng = userEvent.location_lng;
      }
    }

    if (!userLat || !userLng) {
      // No location — still try to match, use 0,0 as placeholder
      // Events will be created at the matched user's location instead
      userLat = 0;
      userLng = 0;
    }

    // Filter matched users by travel distance
    // Get their locations from their most recent events
    const matchedUserIds = matchingSlots.map((s) => s.user_id);

    const nearbyUsers: string[] = [];
    for (const matchedUserId of matchedUserIds) {
      // Try profile location first, then fall back to event location
      const { data: theirProfile } = await supabase
        .from('profiles')
        .select('last_location_lat, last_location_lng')
        .eq('id', matchedUserId)
        .single();

      let theirLat = theirProfile?.last_location_lat;
      let theirLng = theirProfile?.last_location_lng;

      if (!theirLat || !theirLng) {
        const { data: theirEvent } = await supabase
          .from('events')
          .select('location_lat, location_lng')
          .or(`creator_id.eq.${matchedUserId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        theirLat = theirEvent?.location_lat;
        theirLng = theirEvent?.location_lng;
      }

      if (theirLat && theirLng && userLat !== 0 && userLng !== 0) {
        const dist = haversineKm(userLat, userLng, theirLat, theirLng);
        const theirMaxTravel = matchingSlots.find((s) => s.user_id === matchedUserId)?.max_travel_km ?? 5;
        if (dist <= maxTravelKm && dist <= theirMaxTravel) {
          nearbyUsers.push(matchedUserId);
        }
      } else {
        // No location data — assume nearby for hackathon demo
        nearbyUsers.push(matchedUserId);
      }
    }

    // Check if we have enough people (including current user)
    const totalPeople = nearbyUsers.length + 1; // +1 for current user
    if (totalPeople < minPeople) return;

    // --- CHECK FOR EXISTING EVENT ---
    // Before creating a new event, see if there's already an active event
    // for this activity on the same day/time within travel distance
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hourNum = parseInt(timeSlot) || 19;
    const now = new Date();
    const todayDow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    let daysUntil = dayOfWeek - todayDow;
    if (daysUntil < 0) daysUntil += 7; // Only add 7 if truly in the past, NOT if today
    const eventDate = new Date(now);
    eventDate.setDate(now.getDate() + daysUntil);
    eventDate.setHours(hourNum, 0, 0, 0);

    // Look for existing active events with same activity on the same day
    const dayStart = new Date(eventDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(eventDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existingEvents } = await supabase
      .from('events')
      .select('id, location_lat, location_lng, spots_taken, total_spots, creator_id')
      .eq('activity_type', activityType)
      .in('status', ['active', 'full'])
      .gte('starts_at', dayStart.toISOString())
      .lte('starts_at', dayEnd.toISOString());

    // Check if any existing event is within travel distance and has spots
    if (existingEvents && existingEvents.length > 0) {
      const nearbyExisting = existingEvents.find((e) => {
        if (!e.location_lat || !e.location_lng) return false;
        const dist = haversineKm(userLat, userLng, e.location_lat, e.location_lng);
        return dist <= maxTravelKm && e.spots_taken < e.total_spots;
      });

      if (nearbyExisting) {
        // Already an event exists! Check if user is already a participant or invited
        const { data: alreadyParticipant } = await supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', nearbyExisting.id)
          .eq('user_id', userId)
          .maybeSingle();

        const { data: alreadyInvited } = await supabase
          .from('event_invitations')
          .select('id')
          .eq('event_id', nearbyExisting.id)
          .eq('invitee_id', userId)
          .maybeSingle();

        if (!alreadyParticipant && !alreadyInvited) {
          // Send invitation to join existing event
          await supabase.from('event_invitations').insert({
            event_id: nearbyExisting.id,
            inviter_id: nearbyExisting.creator_id,
            invitee_id: userId,
            type: 'auto_suggest',
            status: 'pending',
            suggested_activity: activityType,
            suggested_time: `${dayNames[dayOfWeek]} ${hourNum > 12 ? (hourNum - 12) + 'pm' : hourNum + 'am'}`,
          });

          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'event_reminder',
            title: `🎉 Found a ${activityType} event for you!`,
            body: `There's already a ${activityType} event on ${dayNames[dayOfWeek]}. Tap to join!`,
            metadata: { event_id: nearbyExisting.id },
            read: false,
          });
        }
        return; // Don't create a new event
      }
    }

    // --- No existing event found, create a new one ---

    // Find suggested location (most popular for this activity nearby)
    let suggestedLocation = 'TBD - agree in chat';
    let suggestedLat = userLat;
    let suggestedLng = userLng;

    const { data: popularEvents } = await supabase
      .from('events')
      .select('location_name, location_lat, location_lng')
      .eq('activity_type', activityType)
      .order('created_at', { ascending: false })
      .limit(10);

    if (popularEvents && popularEvents.length > 0) {
      const nearbyPopular = popularEvents.find((e) => {
        if (!e.location_lat || !e.location_lng) return false;
        return haversineKm(userLat, userLng, e.location_lat, e.location_lng) <= maxTravelKm;
      });
      if (nearbyPopular) {
        suggestedLocation = nearbyPopular.location_name;
        suggestedLat = nearbyPopular.location_lat!;
        suggestedLng = nearbyPopular.location_lng!;
      }
    }

    const endsAt = new Date(eventDate);
    endsAt.setHours(hourNum + 2);

    // Auto-create the event
    const { data: newEvent, error: eventError } = await supabase
      .from('events')
      .insert({
        creator_id: userId,
        title: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} - ${dayNames[dayOfWeek]} ${hourNum > 12 ? (hourNum - 12) + 'pm' : hourNum + 'am'}`,
        activity_type: activityType,
        skill_level: 'any',
        location: `POINT(${suggestedLng} ${suggestedLat})`,
        location_lat: suggestedLat,
        location_lng: suggestedLng,
        location_name: suggestedLocation,
        starts_at: eventDate.toISOString(),
        ends_at: endsAt.toISOString(),
        total_spots: Math.max(minPeople + 3, totalPeople + 2), // Leave room for others
        spots_taken: 1, // Creator
        min_participants: minPeople,
        cost_per_person: 0,
        is_now: false,
        min_reputation: 0,
        status: 'active',
      })
      .select('id')
      .single();

    if (eventError || !newEvent) {
      console.error('Auto-match: failed to create event', eventError);
      return;
    }

    // Add creator as participant
    await supabase.from('event_participants').insert({
      event_id: newEvent.id,
      user_id: userId,
    });

    // Notify the creator that a match was found + send them an invitation too
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'event_reminder',
      title: `🎉 Match found! Event created`,
      body: `We matched you with ${nearbyUsers.length} ${nearbyUsers.length === 1 ? 'person' : 'people'} for ${activityType}. Check your event!`,
      metadata: { event_id: newEvent.id },
      read: false,
    });

    // Send invitation to creator too (so they see it in their inbox)
    await supabase.from('event_invitations').insert({
      event_id: newEvent.id,
      inviter_id: null,
      invitee_id: userId,
      type: 'auto_suggest',
      status: 'accepted',
      suggested_location: suggestedLocation,
      suggested_activity: activityType,
      suggested_time: `${dayNames[dayOfWeek]} ${hourNum > 12 ? (hourNum - 12) + 'pm' : hourNum + 'am'}`,
    });

    // Send invitations to all matched users
    for (const matchedUserId of nearbyUsers) {
      // Create invitation
      await supabase.from('event_invitations').insert({
        event_id: newEvent.id,
        inviter_id: userId,
        invitee_id: matchedUserId,
        type: 'auto_suggest',
        status: 'pending',
        suggested_location: suggestedLocation,
        suggested_activity: activityType,
        suggested_time: `${dayNames[dayOfWeek]} ${hourNum > 12 ? (hourNum - 12) + 'pm' : hourNum + 'am'}`,
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: matchedUserId,
        type: 'event_reminder',
        title: `🎉 Match found! ${activityType} on ${dayNames[dayOfWeek]}`,
        body: `${totalPeople} people matched for ${activityType}. Tap to see the event at ${suggestedLocation}.`,
        metadata: { event_id: newEvent.id },
        read: false,
      });
    }
  } catch (err) {
    console.error('Auto-match error:', err);
    // Non-fatal — don't block the availability save
  }
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
