# Implementation Plan: Rally — Spontaneous Activity Finder

## Overview

This implementation plan covers all tasks needed to build the Rally PWA from scratch. Tasks are organized by dependency and each produces a testable increment. The app enables users to create/discover spontaneous activities on a 2D map, join events, chat with participants, and build reputation through attendance.

## Tasks

- [ ] 1. Initialize Next.js 15 project with App Router, TypeScript, Tailwind CSS, and configure ESLint/Prettier. Run `npx shadcn@latest init` to set up shadcn/ui with Rally brand colors. Add core shadcn components (button, card, dialog, drawer, sheet, input, textarea, select, badge, avatar, toast, tabs, command, skeleton, switch, calendar, scroll-area, tooltip, dropdown-menu, form). Install dependencies: @supabase/supabase-js, @supabase/ssr, leaflet, react-leaflet, supercluster, @serwist/next, serwist, zod, react-hook-form, @hookform/resolvers, date-fns, lucide-react, web-push, clsx, tailwind-merge. Create folder structure (app/, components/, components/ui/, lib/, hooks/, types/). Configure tailwind.config with Rally design tokens.
- [ ] 2. Set up Supabase project with PostGIS extension enabled. Run SQL migrations to create all tables (profiles, events, event_participants, chat_messages, notifications, push_subscriptions, notification_preferences) with constraints, indexes (GIST on location, btree on foreign keys), and Row Level Security policies on all tables.
- [ ] 3. Create Supabase client utilities (lib/supabase/client.ts for browser, lib/supabase/server.ts for server components using @supabase/ssr, lib/supabase/middleware.ts for auth session refresh). Create lib/utils.ts with cn() helper (clsx + tailwind-merge). Configure environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
- [ ] 4. Build authentication flow: login page with Google/GitHub OAuth buttons, OAuth callback route handler (/auth/callback), session management with 30-day expiry, middleware redirect logic (no profile → /profile/setup, has profile → /map), error and cancel handling.
- [ ] 5. Build user profile: ProfileForm component with Zod validation (display_name 2-40 chars, bio max 160, at least 1 preferred activity), API routes for profile creation (POST /api/profile/setup) and update (PUT /api/profile), public profile view (/profile/[id]) showing reputation, stats, and preferred activities.
- [ ] 6. Build geolocation utilities: useGeolocation hook using Browser Geolocation API, lib/geo.ts with distance calculation (Haversine formula), permission request flow with fallback to manual address search via Mapbox Geocoding or Nominatim.
- [ ] 7. Build main Map View page (/map): integrate Leaflet via react-leaflet with dynamic import (ssr: false), center on user location, render event markers with Activity_Type icons, implement marker clustering with Supercluster at low zoom, handle map interactions (zoom, pan, tap marker). Use shadcn Drawer (bottom sheet) for event detail overlay on marker tap. Mobile-first layout with BottomNav component (Map, Create, History, Profile tabs using lucide-react icons).
- [ ] 8. Build Event creation: EventForm component using react-hook-form + zod + shadcn Form with all required/optional fields (title, activity_type Select, skill_level Select, location via map pin click + Command palette address search with Nominatim geocoding, starts_at with shadcn Calendar + time input, total_spots, min_participants, cost_per_person, description Textarea, min_reputation). NOW mode auto-toggle (shadcn Switch) when starts_at < 2 hours. API route POST /api/events with Zod validation and 3-per-day NOW limit check. On success, new marker appears on map via Supabase Realtime.
- [ ] 9. Build Event detail page (/event/[id]): display all event info, participant list with ReputationBadge, Join button (with validation: not full, meets reputation, no time overlap with 5 existing events), Leave button, event status indicators. API routes: GET /api/events/[id], POST /api/events/[id]/join, DELETE /api/events/[id]/leave. Real-time participant count updates via Supabase Realtime subscription.
- [ ] 10. Build NOW Mode visuals and broadcast: NowBadge component with CSS pulse animation, distinct marker styling for NOW events on map (larger, glowing, always on top). Supabase Edge Function on event INSERT where is_now=true: query users within 5km with matching preferred_activities, create notification records, send push via Web Push API. Second broadcast at 30min-before if min_participants not met (expand to 10km).
- [ ] 11. Build Map filtering: FilterPanel component using shadcn Sheet (slides from right on mobile) with Activity_Type multi-select (shadcn Command/Checkbox), Skill_Level Select, day-of-week filter, free-only Switch toggle, distance radius Select (1/2/5/10/25/50km). API route GET /api/events accepts filter query params and PostGIS distance filter. Filters persist in URL search params. Real-time update of markers when filters change.
- [ ] 12. Build Rally Chat: ChatPanel component using shadcn ScrollArea for message list and Input for message composition. ChatMessage component with sender avatar (shadcn Avatar), name, timestamp. API routes GET /api/events/[id]/chat (paginated, last 50) and POST /api/events/[id]/chat (with auth + participant check). Supabase Realtime subscription for live messages. Auto-scroll to bottom on new message. Share location button (sends Google Maps link). Mobile-friendly keyboard handling.
- [ ] 13. Build Reputation System: lib/reputation.ts with score calculation (base 100, +5 per attendance capped at bonus 50, -15 per no-show, bounded [0,100]). ReputationBadge component with color coding (green 80-100, yellow 50-79, red 0-49, "New" badge for <3 events). API route POST /api/events/[id]/attendance for creator to mark attendance. Supabase trigger to update profile reputation_score on attendance confirmation.
- [ ] 14. Build Notification system: NotificationBell component showing unread count, notification dropdown/panel with list. API routes GET /api/notifications, PUT /api/notifications/read. Push notification registration (POST /api/push/subscribe). Notification preferences page with toggles (NOW broadcasts, reminders, quiet hours, activity filters). Event reminder Edge Function (cron: every 15 min, finds events starting in 1 hour, sends reminder to participants).
- [ ] 15. Build Event History & Stats: history page (/history) with chronological list of past events (filterable by activity_type, date range). Profile stats section: total events attended, events created, most frequent activity, month-over-month change. API route GET /api/history with pagination and filters.
- [ ] 16. Build event lifecycle management: auto-archive events past start_at (Supabase cron Edge Function, runs every 5 min). Creator event edit (PUT /api/events/[id]) and cancel (DELETE /api/events/[id]) with notifications to all participants. Event status transitions (active → full → completed → archived, active → cancelled). "Watch" feature for full events (notify when spot opens).
- [ ] 17. Implement PWA support: configure Serwist (@serwist/next) with service worker and app/manifest.ts (icons, theme color, display: standalone). NetworkFirst for API routes, CacheFirst for map tiles and static assets. IndexedDB for offline profile/events cache. Background sync queue for offline event creation and joins. Online/offline status indicator (shadcn Toast). Push notification permission flow. Verify Lighthouse PWA audit passes.
- [ ] 18. Implement responsive design and accessibility: responsive layouts 320px-2560px, mobile-first (map + bottom nav primary on ≤768px), touch targets 44x44px with 8px spacing, WCAG 2.1 AA color contrast, keyboard navigation for all interactive elements, aria-labels on map markers and buttons, form labels, aria-live for real-time updates (chat, participant count). LCP ≤ 3s on simulated 4G.
- [ ] 19. Build landing page and deploy: public landing page (/) with app description, screenshots/mockups, "Get Started" CTA. Deploy to Vercel with environment variables configured. Connect GitHub repo. Verify production auth flow (OAuth redirects work). Write README.md with project description, features, tech stack, demo link, setup instructions, and screenshots.

## Task Dependency Graph

```json
{
  "waves": [
    [1],
    [2],
    [3],
    [4],
    [5, 6],
    [7],
    [8, 11],
    [9, 12],
    [10, 13, 14],
    [15, 16],
    [17],
    [18],
    [19]
  ]
}
```

## Notes

- Tasks 8-16 can be partially parallelized once Tasks 1-7 (foundation + map) are complete
- PWA (Task 17) and Accessibility (Task 18) should be done after core features to avoid conflicts
- Deployment (Task 19) depends on all other tasks
- For hackathon demo: prioritize Tasks 1-12 (core loop: auth → map → create → join → chat) — this gives a complete demo-able flow
- PostGIS is critical for performance — ensures geospatial queries use spatial indexes instead of calculating distances in application code
