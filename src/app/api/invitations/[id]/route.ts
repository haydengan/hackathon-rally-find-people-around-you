import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const updateStatusSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateStatusSchema.parse(body);

    // Fetch the invitation to verify ownership
    const { data: invitation, error: fetchError } = await supabase
      .from('event_invitations')
      .select('id, event_id, invitee_id, status')
      .eq('id', id)
      .eq('invitee_id', user.id)
      .single();

    if (fetchError || !invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return Response.json({ error: 'Invitation already responded to' }, { status: 400 });
    }

    // Update invitation status
    const { error: updateError } = await supabase
      .from('event_invitations')
      .update({ status: validated.status })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating invitation:', updateError);
      return Response.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    // If accepted and there's an event_id, auto-join the user to the event
    if (validated.status === 'accepted' && invitation.event_id) {
      // Check if already a participant
      const { data: existingParticipant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', invitation.event_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingParticipant) {
        // Check if event has spots
        const { data: event } = await supabase
          .from('events')
          .select('id, total_spots, spots_taken')
          .eq('id', invitation.event_id)
          .single();

        if (event && event.spots_taken < event.total_spots) {
          // Insert participant
          const { error: joinError } = await supabase
            .from('event_participants')
            .insert({
              event_id: invitation.event_id,
              user_id: user.id,
            });

          if (!joinError) {
            // Increment spots_taken
            await supabase
              .from('events')
              .update({ spots_taken: event.spots_taken + 1 })
              .eq('id', invitation.event_id);
          }
        }
      }
    }

    return Response.json({ success: true, status: validated.status });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
