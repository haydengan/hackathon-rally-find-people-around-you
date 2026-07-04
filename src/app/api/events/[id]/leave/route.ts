import { createClient } from '@/lib/supabase/server';

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

    // Fetch the event to check creator
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, creator_id, spots_taken, total_spots, status')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Creators cannot leave their own event
    if (event.creator_id === user.id) {
      return Response.json(
        { error: 'Creators cannot leave their own event' },
        { status: 400 }
      );
    }

    // Check user is actually a participant
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return Response.json(
        { error: 'You are not a participant of this event' },
        { status: 400 }
      );
    }

    // Delete participant
    const { error: deleteError } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error leaving event:', deleteError);
      return Response.json({ error: 'Failed to leave event' }, { status: 500 });
    }

    // Check waitlist for auto-promote
    const { data: waitlistEntry } = await supabase
      .from('event_waitlist')
      .select('id, user_id')
      .eq('event_id', id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (waitlistEntry) {
      // Auto-promote first person from waitlist
      const { error: promoteError } = await supabase
        .from('event_participants')
        .insert({
          event_id: id,
          user_id: waitlistEntry.user_id,
        });

      if (!promoteError) {
        // Remove from waitlist
        await supabase
          .from('event_waitlist')
          .delete()
          .eq('id', waitlistEntry.id);

        // Create notification for promoted user
        await supabase.from('notifications').insert({
          user_id: waitlistEntry.user_id,
          type: 'new_participant',
          title: 'You\'re in!',
          body: 'A spot opened up and you\'ve been added to the event.',
          metadata: { event_id: id },
          read: false,
        });

        // Spots stay the same (one left, one joined) — keep status as full
        // No need to update spots_taken since net change is 0
        return Response.json({ message: 'Left event successfully' });
      }
    }

    // No waitlist promotion — decrement spots_taken
    const newSpotsTaken = Math.max(0, event.spots_taken - 1);
    const updateData: { spots_taken: number; status?: string } = {
      spots_taken: newSpotsTaken,
    };

    // If event was full, reactivate it
    if (event.status === 'full') {
      updateData.status = 'active';
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating spots:', updateError);
    }

    return Response.json({ message: 'Left event successfully' });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
