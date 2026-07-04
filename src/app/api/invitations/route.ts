import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const createInvitationSchema = z.object({
  event_id: z.string().uuid(),
  invitee_id: z.string().uuid(),
  message: z.string().max(500).optional(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invitations, error } = await supabase
      .from('event_invitations')
      .select(`
        id, event_id, inviter_id, invitee_id, type, status, message,
        suggested_location, suggested_activity, suggested_time, created_at,
        inviter:profiles!event_invitations_inviter_id_fkey(id, display_name, avatar_url, reputation_score),
        event:events!event_invitations_event_id_fkey(id, title, activity_type, location_name, starts_at, total_spots, spots_taken)
      `)
      .eq('invitee_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return Response.json({ error: 'Failed to fetch invitations' }, { status: 500 });
    }

    return Response.json({ data: invitations });
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
    const validated = createInvitationSchema.parse(body);

    // Verify the inviter is a participant or creator of the event
    const { data: event } = await supabase
      .from('events')
      .select('id, creator_id')
      .eq('id', validated.event_id)
      .single();

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    let isAllowed = event.creator_id === user.id;

    if (!isAllowed) {
      const { data: participant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', validated.event_id)
        .eq('user_id', user.id)
        .maybeSingle();

      isAllowed = !!participant;
    }

    if (!isAllowed) {
      return Response.json({ error: 'Only event participants can invite others' }, { status: 403 });
    }

    // Check if already invited
    const { data: existingInvite } = await supabase
      .from('event_invitations')
      .select('id')
      .eq('event_id', validated.event_id)
      .eq('invitee_id', validated.invitee_id)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return Response.json({ error: 'User already has a pending invitation' }, { status: 409 });
    }

    const { data: invitation, error } = await supabase
      .from('event_invitations')
      .insert({
        event_id: validated.event_id,
        inviter_id: user.id,
        invitee_id: validated.invitee_id,
        type: 'manual',
        status: 'pending',
        message: validated.message || null,
      })
      .select('id, event_id, inviter_id, invitee_id, type, status, message, created_at')
      .single();

    if (error) {
      console.error('Error creating invitation:', error);
      return Response.json({ error: 'Failed to create invitation' }, { status: 500 });
    }

    return Response.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
