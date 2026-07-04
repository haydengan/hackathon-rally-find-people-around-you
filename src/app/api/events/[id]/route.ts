import { createClient } from '@/lib/supabase/server';
import { eventSchema } from '@/lib/validations/event';
import { z } from 'zod';

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

    // Fetch event with creator profile
    const { data: event, error } = await supabase
      .from('events')
      .select(`
        id, creator_id, title, description, activity_type, skill_level,
        location_name, location_lat, location_lng, starts_at, total_spots,
        spots_taken, min_participants, cost_per_person, is_now,
        min_reputation, status, created_at,
        creator:profiles!events_creator_id_fkey(id, display_name, avatar_url, reputation_score, events_attended)
      `)
      .eq('id', id)
      .single();

    if (error || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch participants with their profiles
    const { data: participants } = await supabase
      .from('event_participants')
      .select(`
        id, event_id, user_id, joined_at, attended,
        profile:profiles!event_participants_user_id_fkey(id, display_name, avatar_url, reputation_score, events_attended)
      `)
      .eq('event_id', id)
      .order('joined_at', { ascending: true });

    const transformed = {
      ...event,
      location: { lat: event.location_lat, lng: event.location_lng },
      participants: participants ?? [],
    };

    return Response.json({ data: transformed });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    // Verify the user is the event creator
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('id, creator_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existing.creator_id !== user.id) {
      return Response.json({ error: 'Only the event creator can edit this event' }, { status: 403 });
    }

    if (existing.status === 'cancelled') {
      return Response.json({ error: 'Cannot edit a cancelled event' }, { status: 400 });
    }

    const body = await request.json();
    const validated = eventSchema.partial().parse(body);

    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update(validated)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return Response.json({ error: 'Failed to update event' }, { status: 500 });
    }

    return Response.json({ data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Verify the user is the event creator
    const { data: existing, error: fetchError } = await supabase
      .from('events')
      .select('id, creator_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (existing.creator_id !== user.id) {
      return Response.json({ error: 'Only the event creator can cancel this event' }, { status: 403 });
    }

    if (existing.status === 'cancelled') {
      return Response.json({ error: 'Event is already cancelled' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (updateError) {
      return Response.json({ error: 'Failed to cancel event' }, { status: 500 });
    }

    return Response.json({ message: 'Event cancelled successfully' });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
