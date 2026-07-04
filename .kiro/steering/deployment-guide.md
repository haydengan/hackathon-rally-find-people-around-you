---
inclusion: manual
---

# Deployment & Infrastructure Guide

## Vercel Deployment

### Environment Variables Required
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (server-side only)
NEXT_PUBLIC_APP_URL=https://rally-app.vercel.app
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx  (if using Mapbox)
VAPID_PUBLIC_KEY=xxx  (for web push)
VAPID_PRIVATE_KEY=xxx  (for web push, server-side only)
```

### Deploy Steps
1. Push to GitHub (main branch)
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

### Preview Deployments
- Every PR gets a preview URL automatically
- Use preview URLs for testing before merge

## Supabase Configuration

### Required Extensions
- PostGIS: Enable via SQL `CREATE EXTENSION IF NOT EXISTS postgis;`

### Auth Providers
1. Google OAuth: Configure in Supabase Dashboard → Authentication → Providers
   - Add authorized redirect URL: `{APP_URL}/auth/callback`
2. GitHub OAuth: Same process with GitHub app credentials
   - Create OAuth App at github.com/settings/developers

### Edge Functions
- `send-now-broadcast`: Triggered on event INSERT where is_now = true
- `archive-events`: Cron every 5 min, archives past events
- `send-reminders`: Cron every 15 min, sends 1-hour-before reminders
- Deploy: `supabase functions deploy <function-name>`

### Database Migrations
- Run migrations in order from `supabase/migrations/` folder
- Use `supabase db push` for development
- Use `supabase migration up` for production

## Performance Monitoring
- Vercel Analytics for Core Web Vitals (LCP, FID, CLS)
- Supabase Dashboard for query performance
- Target: LCP < 3s on 4G mobile

## Security Checklist
- [ ] RLS enabled on all tables
- [ ] Service role key only server-side (not in NEXT_PUBLIC_ vars)
- [ ] PostGIS queries use parameterized inputs (prevent SQL injection)
- [ ] Rate limiting on NOW event creation (3/day/user)
- [ ] Zod validation on all API routes
- [ ] OAuth state parameter verified in callback
- [ ] Push subscription validated per-user
- [ ] Event join checks: reputation threshold, spot availability, time overlap

## Map Provider Options

### Option A: Mapbox GL JS (Recommended)
- Free tier: 50K map loads/month
- Requires API key (NEXT_PUBLIC_MAPBOX_TOKEN)
- Beautiful default styles, great performance
- Built-in geocoding for address search

### Option B: Leaflet + OpenStreetMap (Free forever)
- No API key needed
- Completely free, no usage limits
- Slightly less polished but fully functional
- Use react-leaflet for React integration
- Geocoding via Nominatim (free, rate-limited)
