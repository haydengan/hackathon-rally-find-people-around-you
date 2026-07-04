import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = locationSchema.parse(body);

    await supabase
      .from('profiles')
      .update({
        last_location_lat: validated.lat,
        last_location_lng: validated.lng,
      })
      .eq('id', user.id);

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
