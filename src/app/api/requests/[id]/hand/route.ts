import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check request exists and is active
    const { data: rallyRequest, error: fetchError } = await supabase
      .from('rally_requests')
      .select('id, status, expires_at, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !rallyRequest) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (rallyRequest.status !== 'active') {
      return Response.json({ error: 'Request is no longer active' }, { status: 400 });
    }

    if (new Date(rallyRequest.expires_at) < new Date()) {
      return Response.json({ error: 'Request has expired' }, { status: 400 });
    }

    // Don't allow creator to raise their own hand
    if (rallyRequest.user_id === user.id) {
      return Response.json({ error: 'Cannot raise hand on your own request' }, { status: 400 });
    }

    // Check if user already raised hand
    const { data: existing } = await supabase
      .from('rally_request_hands')
      .select('id')
      .eq('request_id', id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      return Response.json({ error: 'You already raised your hand' }, { status: 409 });
    }

    // Insert hand
    const { data: hand, error: insertError } = await supabase
      .from('rally_request_hands')
      .insert({
        request_id: id,
        user_id: user.id,
      })
      .select('id, request_id, user_id, created_at')
      .single();

    if (insertError) {
      console.error('Error raising hand:', insertError);
      return Response.json({ error: 'Failed to raise hand' }, { status: 500 });
    }

    return Response.json({ data: hand }, { status: 201 });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Remove the user's hand
    const { error: deleteError } = await supabase
      .from('rally_request_hands')
      .delete()
      .eq('request_id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error lowering hand:', deleteError);
      return Response.json({ error: 'Failed to lower hand' }, { status: 500 });
    }

    return Response.json({ data: { success: true } });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
