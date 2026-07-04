import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const messageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(1000),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: partnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch messages between current user and partner (last 50, oldest first)
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Error fetching DMs:', error);
      return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Mark unread messages from partner as read
    await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    return Response.json({ data: messages ?? [] });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: partnerId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = messageSchema.parse(body);

    // Verify mutual follow (both users follow each other)
    const { data: iFollow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', partnerId)
      .single();

    const { data: theyFollow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', partnerId)
      .eq('following_id', user.id)
      .single();

    if (!iFollow || !theyFollow) {
      return Response.json(
        { error: 'DMs require mutual follow' },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error: insertError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: partnerId,
        content: validated.content,
        read: false,
      })
      .select('id, sender_id, receiver_id, content, read, created_at')
      .single();

    if (insertError || !message) {
      console.error('Error sending DM:', insertError);
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
