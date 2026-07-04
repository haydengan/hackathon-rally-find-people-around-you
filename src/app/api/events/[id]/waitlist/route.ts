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

    // Get waitlist count
    const { count, error: countError } = await supabase
      .from('event_waitlist')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', id);

    if (countError) {
      console.error('Error fetching waitlist count:', countError);
      return Response.json({ error: 'Failed to fetch waitlist' }, { status: 500 });
    }

    // Check if current user is on waitlist
    const { data: userWaitlist } = await supabase
      .from('event_waitlist')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    return Response.json({
      data: {
        count: count ?? 0,
        is_on_waitlist: !!userWaitlist,
      },
    });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
      .select('id, total_spots, spots_taken, status')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Event should be full for waitlist to make sense
    if (event.status !== 'full') {
      return Response.json(
        { error: 'Event is not full — you can join directly' },
        { status: 400 }
      );
    }

    // Check user is not already a participant
    const { data: existingParticipant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingParticipant) {
      return Response.json(
        { error: 'You are already a participant' },
        { status: 400 }
      );
    }

    // Check user is not already on waitlist
    const { data: existingWaitlist } = await supabase
      .from('event_waitlist')
      .select('id')
      .eq('event_id', id)
      .eq('user_id', user.id)
      .single();

    if (existingWaitlist) {
      return Response.json(
        { error: 'You are already on the waitlist' },
        { status: 400 }
      );
    }

    // Add to waitlist
    const { error: insertError } = await supabase
      .from('event_waitlist')
      .insert({
        event_id: id,
        user_id: user.id,
      });

    if (insertError) {
      console.error('Error adding to waitlist:', insertError);
      return Response.json({ error: 'Failed to join waitlist' }, { status: 500 });
    }

    return Response.json({ message: 'Added to waitlist' }, { status: 201 });
  } catch {
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

    // Remove from waitlist
    const { error: deleteError } = await supabase
      .from('event_waitlist')
      .delete()
      .eq('event_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error removing from waitlist:', deleteError);
      return Response.json({ error: 'Failed to leave waitlist' }, { status: 500 });
    }

    return Response.json({ message: 'Removed from waitlist' });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
