import { createClient } from '@/lib/supabase/server';

export async function POST(
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

    // Fetch the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, creator_id, total_spots, spots_taken, min_reputation, status, starts_at')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check event is still active
    if (event.status === 'full') {
      return Response.json({ error: 'Event is full' }, { status: 400 });
    }

    if (event.status !== 'active') {
      return Response.json({ error: 'Event is no longer active' }, { status: 400 });
    }

    // Check if user already joined
    const { data: existing } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return Response.json({ error: 'You have already joined this event' }, { status: 400 });
    }

    // Check user reputation
    const { data: profile } = await supabase
      .from('profiles')
      .select('reputation_score')
      .eq('id', user.id)
      .single();

    if (profile && profile.reputation_score < event.min_reputation) {
      return Response.json(
        { error: `Minimum reputation of ${event.min_reputation} required` },
        { status: 403 }
      );
    }

    // Check overlapping events (max 5)
    const { count: overlapCount } = await supabase
      .from('event_participants')
      .select('id, event:events!event_participants_event_id_fkey(starts_at, status)', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('event.status', 'active');

    if ((overlapCount ?? 0) >= 5) {
      return Response.json(
        { error: 'You cannot join more than 5 active events at a time' },
        { status: 400 }
      );
    }

    // Insert participant
    const { error: insertError } = await supabase
      .from('event_participants')
      .insert({
        event_id: id,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Error joining event:', insertError);
      return Response.json({ error: 'Failed to join event' }, { status: 500 });
    }

    // Increment spots_taken
    const newSpotsTaken = event.spots_taken + 1;
    const updateData: { spots_taken: number; status?: string } = {
      spots_taken: newSpotsTaken,
    };

    // If event is now full, update status
    if (newSpotsTaken >= event.total_spots) {
      updateData.status = 'full';
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating spots:', updateError);
    }

    return Response.json({ message: 'Joined event successfully' });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
