import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
});

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

    // Check user is a participant or creator
    const { data: event } = await supabase
      .from('events')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const isCreator = event.creator_id === user.id;

    if (!isCreator) {
      const { data: participant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .single();

      if (!participant) {
        return Response.json(
          { error: 'You must be a participant to view chat' },
          { status: 403 }
        );
      }
    }

    // Fetch last 50 messages with sender profile
    const url = new URL(request.url);
    const before = url.searchParams.get('before');

    let query = supabase
      .from('chat_messages')
      .select(`
        id, event_id, sender_id, content, created_at,
        sender:profiles!chat_messages_sender_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Return in chronological order
    return Response.json({ data: (messages ?? []).reverse() });
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

    // Check user is a participant or creator
    const { data: event } = await supabase
      .from('events')
      .select('id, creator_id')
      .eq('id', id)
      .single();

    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    const isCreator = event.creator_id === user.id;

    if (!isCreator) {
      const { data: participant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', id)
        .eq('user_id', user.id)
        .single();

      if (!participant) {
        return Response.json(
          { error: 'You must be a participant to send messages' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validated = messageSchema.parse(body);

    const { data: message, error: insertError } = await supabase
      .from('chat_messages')
      .insert({
        event_id: id,
        sender_id: user.id,
        content: validated.content,
      })
      .select(`
        id, event_id, sender_id, content, created_at,
        sender:profiles!chat_messages_sender_id_fkey(id, display_name, avatar_url, reputation_score)
      `)
      .single();

    if (insertError || !message) {
      console.error('Error sending message:', insertError);
      return Response.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
