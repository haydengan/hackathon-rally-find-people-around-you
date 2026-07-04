import { createClient } from '@/lib/supabase/server';
import { fulfillRequestSchema } from '@/lib/validations/rally-request';
import { z } from 'zod';

export async function POST(
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
    const validated = fulfillRequestSchema.parse(body);

    // Verify the request belongs to the current user
    const { data: rallyRequest, error: fetchError } = await supabase
      .from('rally_requests')
      .select('id, user_id, status, activity_type')
      .eq('id', id)
      .single();

    if (fetchError || !rallyRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (rallyRequest.user_id !== user.id) {
      return Response.json({ error: 'Only the request creator can fulfill it' }, { status: 403 });
    }

    if (rallyRequest.status !== 'active') {
      return Response.json({ error: 'Request is not active' }, { status: 400 });
    }

    // Update the request status to fulfilled
    const { error: updateError } = await supabase
      .from('rally_requests')
      .update({ status: 'fulfilled' })
      .eq('id', id);

    if (updateError) {
      console.error('Error fulfilling request:', updateError);
      return Response.json({ error: 'Failed to fulfill request' }, { status: 500 });
    }

    // Notify all hand-raisers about the new event
    const { data: hands } = await supabase
      .from('rally_request_hands')
      .select('user_id')
      .eq('request_id', id);

    if (hands && hands.length > 0) {
      const notifications = hands.map((hand) => ({
        user_id: hand.user_id,
        type: 'rally_request_fulfilled',
        title: 'An event was created from a request you were interested in!',
        body: `Check out the new ${rallyRequest.activity_type} event.`,
        metadata: {
          event_id: validated.event_id,
          request_id: id,
        },
        read: false,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
        // Non-fatal — request is still fulfilled
      }
    }

    return Response.json({ data: { success: true, event_id: validated.event_id } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
