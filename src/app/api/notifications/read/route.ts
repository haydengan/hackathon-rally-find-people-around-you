import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = markReadSchema.parse(body);

    if (validated.ids && validated.ids.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .in('id', validated.ids);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return Response.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }
    } else {
      // Mark all as read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return Response.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }
    }

    return Response.json({ message: 'Notifications marked as read' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
