import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const attendanceSchema = z.object({
  user_id: z.string().uuid(),
  attended: z.boolean(),
});

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

    // Verify the current user is the event creator
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, creator_id, starts_at')
      .eq('id', id)
      .single();

    if (eventError || !event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.creator_id !== user.id) {
      return Response.json({ error: 'Only the event creator can mark attendance' }, { status: 403 });
    }

    const body = await request.json();
    const validated = attendanceSchema.parse(body);

    // Verify the target user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('event_participants')
      .select('id, attended')
      .eq('event_id', id)
      .eq('user_id', validated.user_id)
      .single();

    if (participantError || !participant) {
      return Response.json({ error: 'User is not a participant of this event' }, { status: 404 });
    }

    // Don't re-process if already marked
    if (participant.attended === validated.attended) {
      return Response.json({ message: 'Attendance already recorded' });
    }

    // Update the participant's attended field
    const { error: updateError } = await supabase
      .from('event_participants')
      .update({ attended: validated.attended })
      .eq('event_id', id)
      .eq('user_id', validated.user_id);

    if (updateError) {
      console.error('Error updating attendance:', updateError);
      return Response.json({ error: 'Failed to update attendance' }, { status: 500 });
    }

    // Get the user's current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('reputation_score, events_attended')
      .eq('id', validated.user_id)
      .single();

    if (profileError || !profile) {
      return Response.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Calculate new reputation score
    let newScore = profile.reputation_score;
    const profileUpdate: { reputation_score: number; events_attended?: number } = {
      reputation_score: newScore,
    };

    if (validated.attended) {
      // +5 for attendance, capped at 100
      newScore = Math.min(100, newScore + 5);
      profileUpdate.reputation_score = newScore;
      profileUpdate.events_attended = profile.events_attended + 1;
    } else {
      // -15 for no-show, minimum 0
      newScore = Math.max(0, newScore - 15);
      profileUpdate.reputation_score = newScore;
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', validated.user_id);

    if (profileUpdateError) {
      console.error('Error updating profile reputation:', profileUpdateError);
      return Response.json({ error: 'Failed to update reputation' }, { status: 500 });
    }

    return Response.json({
      message: validated.attended ? 'Attendance confirmed' : 'No-show recorded',
      new_reputation_score: newScore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
