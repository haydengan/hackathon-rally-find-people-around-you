import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all messages where user is sender or receiver, grouped by conversation partner
    // We'll fetch all DMs involving this user and group by the other participant
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select(`
        id, sender_id, receiver_id, content, read, created_at
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DM conversations:', error);
      return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Group by conversation partner and get latest message
    const conversationMap = new Map<string, {
      partner_id: string;
      last_message: string;
      last_message_at: string;
      unread_count: number;
    }>();

    for (const msg of messages ?? []) {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partner_id: partnerId,
          last_message: msg.content,
          last_message_at: msg.created_at,
          unread_count: 0,
        });
      }

      // Count unread messages from partner
      if (msg.sender_id !== user.id && !msg.read) {
        const conv = conversationMap.get(partnerId)!;
        conv.unread_count++;
      }
    }

    const partnerIds = Array.from(conversationMap.keys());

    if (partnerIds.length === 0) {
      return Response.json({ data: [] });
    }

    // Fetch partner profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', partnerIds);

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p])
    );

    // Build conversation list
    const conversations = Array.from(conversationMap.values())
      .map((conv) => ({
        ...conv,
        partner: profileMap.get(conv.partner_id) ?? null,
      }))
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    return Response.json({ data: conversations });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
