import { createClient } from '@/lib/supabase/server';
import { profileSchema } from '@/lib/validations/profile';
import { z } from 'zod';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, display_name, bio, avatar_url, preferred_activities, activity_levels, reputation_score, events_attended, events_created, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    return Response.json({ data: profile });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        display_name: validated.display_name,
        bio: validated.bio || null,
        preferred_activities: validated.preferred_activities,
        activity_levels: body.activity_levels ?? {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('id, display_name, bio, avatar_url, preferred_activities, activity_levels, reputation_score, events_attended, events_created, created_at, updated_at')
      .single();

    if (error || !profile) {
      return Response.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return Response.json({ data: profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.issues }, { status: 400 });
    }
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
