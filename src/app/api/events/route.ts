import { createClient } from '@/lib/supabase/server';
import { eventSchema } from '@/lib/validations/event';
import { z } from 'zod';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const activityType = url.searchParams.get('activity_type');
    const skillLevel = url.searchParams.get('skill_level');
    const freeOnly = url.searchParams.get('free_only') === 'true';
    const includePast = url.searchParams.get('include_past') === 'true';

    // Fetch events with creator profile joined
    let query = supabase
      .from('events')
      .select(`
        id, creator_id, title, description, activity_type, skill_level,
        location_name, location_lat, location_lng, starts_at, ends_at, total_spots,
        spots_taken, min_participants, cost_per_person, is_now,
        min_reputation, status, created_at,
        creator:profiles!events_creator_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .in('status', ['active', 'full']);

    // Only filter future events if not including past
    if (!includePast) {
      query = query.gt('starts_at', new Date().toISOString());
    }

    if (activityType) {
      query = query.eq('activity_type', activityType);
    }

    if (skillLevel && skillLevel !== 'any') {
      query = query.eq('skill_level', skillLevel);
    }

    if (freeOnly) {
      query = query.eq('cost_per_person', 0);
    }

    const { data: events, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Transform events to match the Event interface with location object
    const transformed = (events ?? []).map((event) => ({
      ...event,
      location: { lat: event.location_lat, lng: event.location_lng },
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
    const validated = eventSchema.parse(body);

    // If is_now, check daily limit (max 3 NOW events per day)
    if (validated.is_now) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error: countError } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', user.id)
        .eq('is_now', true)
        .gte('created_at', today.toISOString());

      if (countError) {
        console.error('Error checking NOW limit:', countError);
        return Response.json({ error: 'Failed to check NOW limit' }, { status: 500 });
      }

      if ((count ?? 0) >= 3) {
        return Response.json(
          { error: 'You can only create 3 NOW events per day' },
          { status: 429 }
        );
      }
    }

    // Insert event with PostGIS location
    const { data: event, error: insertError } = await supabase
      .from('events')
      .insert({
        creator_id: user.id,
        title: validated.title,
        description: validated.description || null,
        activity_type: validated.activity_type,
        skill_level: validated.skill_level,
        location: `POINT(${validated.location_lng} ${validated.location_lat})`,
        location_lat: validated.location_lat,
        location_lng: validated.location_lng,
        location_name: validated.location_name,
        starts_at: validated.starts_at,
        ends_at: validated.ends_at,
        total_spots: validated.total_spots,
        min_participants: validated.min_participants,
        cost_per_person: validated.cost_per_person,
        is_now: validated.is_now,
        min_reputation: validated.min_reputation,
        recurrence: validated.recurrence ?? null,
        spots_taken: 1, // Creator is the first participant
        status: 'active',
      })
      .select('id, creator_id, title, activity_type, skill_level, location_name, location_lat, location_lng, starts_at, total_spots, spots_taken, min_participants, cost_per_person, is_now, min_reputation, recurrence, status, created_at')
      .single();

    if (insertError || !event) {
      console.error('Error creating event:', insertError);
      return Response.json({ error: 'Failed to create event' }, { status: 500 });
    }

    // Auto-add creator as first participant
    const { error: participantError } = await supabase
      .from('event_participants')
      .insert({
        event_id: event.id,
        user_id: user.id,
      });

    if (participantError) {
      console.error('Error adding creator as participant:', participantError);
      // Event was created, non-fatal error
    }

    return Response.json({ data: event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
