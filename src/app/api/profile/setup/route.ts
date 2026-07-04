import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validations/profile';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = profileSchema.parse(body);

    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existing) {
      return Response.json(
        { error: 'Profile already exists' },
        { status: 409 }
      );
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: validated.display_name,
        bio: validated.bio || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        preferred_activities: validated.preferred_activities,
        activity_levels: body.activity_levels ?? {},
      })
      .select('id, display_name, bio, avatar_url, preferred_activities, activity_levels, reputation_score, events_attended, events_created, created_at, updated_at')
      .single();

    if (error) {
      return Response.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return Response.json({ data: profile }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
