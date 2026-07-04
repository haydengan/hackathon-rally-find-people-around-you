---
inclusion: fileMatch
fileMatchPattern: "**/*supabase*"
---

# Supabase Integration Guide

## Client Setup
- Browser client: `lib/supabase/client.ts` using `createBrowserClient()`
- Server client: `lib/supabase/server.ts` using `createServerClient()` with cookies
- Middleware: `lib/supabase/middleware.ts` for session refresh on every request

## Auth Configuration
- Providers: Google OAuth, GitHub OAuth
- Redirect URL: `{SITE_URL}/auth/callback`
- Session duration: 30 days
- Always verify user server-side before data operations

## PostGIS Usage

### Storing Locations
```sql
-- Insert event with location
INSERT INTO events (title, location, location_name, ...)
VALUES ('Basketball', ST_SetSRID(ST_MakePoint(103.8198, 1.3521), 4326)::geography, 'Court X', ...);
```

### Querying Nearby Events
```sql
-- Find events within 5km radius
SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) / 1000 as distance_km
FROM events
WHERE status = 'active'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, 5000)
  AND starts_at > NOW()
ORDER BY is_now DESC, starts_at ASC;
```

### Important: Parameter Order
- `ST_MakePoint(longitude, latitude)` — longitude FIRST, latitude SECOND
- This is the opposite of what most people expect (lat, lng)

## Row Level Security (RLS) Policies
All tables have RLS enabled:
- `profiles`: Anyone can read (for participant lists), users update only their own
- `events`: Anyone authenticated can read active events, creators can update/delete their own
- `event_participants`: Authenticated users can read participants of events they can see, insert/delete their own participation
- `chat_messages`: Participants of an event can read/insert messages for that event
- `notifications`: Users can only read/update their own
- `push_subscriptions`: Users can only manage their own

## Realtime Configuration
- Enable realtime on: `events`, `event_participants`, `chat_messages`, `notifications`
- Use channel subscriptions with filters to scope to relevant data
- Always unsubscribe on component unmount

## Edge Functions

### send-now-broadcast
- Triggered by: Database webhook on INSERT to events WHERE is_now = true
- Logic: Query profiles within 5km with matching preferred_activities, send push notifications
- Expansion: If 30min before start and min_participants not met, expand to 10km

### archive-events
- Cron: Every 5 minutes
- Logic: UPDATE events SET status = 'archived' WHERE starts_at < NOW() AND status IN ('active', 'full')

### send-reminders
- Cron: Every 15 minutes
- Logic: Find events starting in 45-75 min window, send reminder to participants who haven't been reminded

## Performance Tips
- Use specific column selects: `.select('id, title, activity_type, location, starts_at, spots_taken, total_spots, is_now')`
- Use `.range(0, 49)` for pagination
- PostGIS GIST index handles proximity queries efficiently
- For chat: load last 50 messages, paginate older on scroll-up
- Cache event data client-side, use Realtime for incremental updates
