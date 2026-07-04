---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx,json,mjs}"
---

# Tech Stack & Design Decisions

## Framework: Next.js 15 (App Router)

We use **Next.js 15** (not 14) because:
- It's the current stable version as of 2025/2026
- App Router is mature and the default for all new projects
- React Server Components are stable — render on server by default, `'use client'` only for interactivity
- Turbopack is default in development (faster HMR)
- Native PWA support (manifest.ts, service worker via public/) — no plugin needed for basic setup

### Key Patterns
- `app/` directory with route groups: `(auth)`, `(protected)`
- Server Components by default — avoids unnecessary client JS
- `loading.tsx` for Suspense fallbacks, `error.tsx` for error boundaries
- Route handlers in `route.ts` (not pages API routes)
- `metadata` exports for SEO on every page
- Dynamic imports with `next/dynamic` for heavy client components (map, charts)

## UI: shadcn/ui + Tailwind CSS

**shadcn/ui** is our component library. It's not installed as a dependency — components are copied into the project, giving us full control.

### Why shadcn/ui
- Built on Radix UI primitives (accessible by default, WCAG compliant)
- Tailwind CSS styling — consistent with our utility-first approach
- Components are fully customizable (no overriding library styles)
- Works perfectly with Next.js App Router and Server Components
- Used in production by Vercel, Supabase, and thousands of apps
- Great mobile patterns: Drawer (bottom sheet), Sheet (side panel), Command (search)

### shadcn/ui Components We'll Use

| Component | Use Case in Rally |
|-----------|-------------------|
| **Button** | Join event, Create event, filter actions |
| **Card** | Event cards on map overlay, participant cards |
| **Dialog** | Confirmation dialogs (leave event, cancel event) |
| **Drawer** | Mobile bottom sheet for event details (swipe up from map) |
| **Sheet** | Filter panel slide-in on mobile |
| **Input / Textarea** | Event form fields, chat input |
| **Select** | Activity type, skill level dropdowns |
| **Badge** | NOW badge, skill level indicator, activity type tag |
| **Avatar** | User profile photos in participant list |
| **Toast** | Success/error notifications (joined, left, created) |
| **Tabs** | History page (Created / Joined tabs) |
| **Command** | Location search with autocomplete |
| **Skeleton** | Loading states for map, event list |
| **Switch** | NOW mode toggle, notification preferences |
| **Calendar** | Date picker for event creation |
| **ScrollArea** | Chat message list, participant list |
| **Tooltip** | Reputation score explanation, map marker hover |
| **DropdownMenu** | Event actions (edit, cancel, share) |
| **Form** | All forms use react-hook-form + zod + shadcn Form component |

### Mobile Design Patterns
- **Bottom Drawer** for event detail cards (user taps map marker → drawer slides up with event info)
- **Bottom Navigation Bar** with 4 tabs: Map, Create, History, Profile
- **Sheet** for filter panel (slides from right on mobile)
- **Command Palette** for location search (Mapbox Geocoding / Nominatim)
- All touch targets 44x44px minimum with 8px spacing

### Setup Command
```bash
npx shadcn@latest init
# Then add components:
npx shadcn@latest add button card dialog drawer sheet input textarea select badge avatar toast tabs command skeleton switch calendar scroll-area tooltip dropdown-menu form
```

## Map: Leaflet + React Leaflet (Free) OR Mapbox GL JS

### Recommendation: Start with Leaflet (free), upgrade to Mapbox if needed

| Criteria | Leaflet + OSM | Mapbox GL JS |
|----------|---------------|--------------|
| Cost | Free forever, no limits | 50K loads/month free, then $5/1K |
| API Key | None needed | Required |
| Performance | DOM-based, good for <500 markers | WebGL, better for 1000+ markers |
| Styling | Basic tiles, less customizable | Beautiful vector tiles, dark mode |
| Geocoding | Nominatim (free, rate-limited) | Mapbox Geocoding (50K req/month free) |
| React wrapper | react-leaflet (stable) | react-map-gl (by Uber/Visgl) |
| Next.js SSR | Must use `dynamic(() => import(), { ssr: false })` | Same |
| Clustering | react-leaflet-cluster + supercluster | Built-in with supercluster |

**For hackathon**: Use Leaflet — zero cost, no API key to manage, sufficient performance for our scale. Can swap to Mapbox later by changing the tile provider.

### Leaflet in Next.js Pattern
```typescript
// Must disable SSR since Leaflet uses window/document
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />
});
```

### Map + shadcn/ui Integration
- Map takes full viewport height on mobile
- Event card appears as shadcn `Drawer` (bottom sheet) on marker tap
- Filter panel uses shadcn `Sheet` (slides from side)
- Location search uses shadcn `Command` with geocoding results

## PWA: Serwist (successor to next-pwa)

**Serwist** is the maintained successor to `next-pwa`. It works with Next.js 15+ and Turbopack.

### Why Serwist over next-pwa
- `next-pwa` requires webpack — incompatible with Turbopack (Next.js 15+ default)
- Serwist is actively maintained, supports Next.js 15/16
- Same Workbox foundation, similar API
- Proper TypeScript support

### Alternative: Native Service Worker (no library)
Next.js 15+ supports PWA natively:
- `app/manifest.ts` for web manifest
- `public/sw.js` for manual service worker
- No build plugin needed for basic offline + install

For our hackathon: **use Serwist** for proper caching strategies (NetworkFirst for API, CacheFirst for assets) and background sync.

### Setup
```bash
npm install @serwist/next serwist
```

## Forms: react-hook-form + zod + shadcn Form

This is the industry standard pattern for Next.js + shadcn:
- `react-hook-form` for form state management (performant, minimal re-renders)
- `zod` for schema validation (shared between client and API routes)
- shadcn `Form` component wires them together with accessible error messages

```typescript
// Shared schema between client and server
const eventSchema = z.object({
  title: z.string().min(5).max(80),
  activity_type: z.string(),
  starts_at: z.string().datetime(),
  total_spots: z.number().min(2).max(50),
  cost_per_person: z.number().min(0).max(500).default(0),
});
```

## Real-time: Supabase Realtime (WebSocket)

- Used for: live event updates on map, chat messages, participant count changes
- Pattern: subscribe on component mount, unsubscribe on unmount
- Channels scoped by event ID to limit bandwidth

## Icons: Lucide React

- Tree-shakable, consistent stroke icons
- Same icon set shadcn/ui uses internally
- Activity type icons: map custom emoji/icons to each type

## Date Handling: date-fns

- Lightweight (tree-shakable), no moment.js bloat
- `formatDistanceToNow()` for "starts in 2 hours"
- `format()` for event dates
- `isWithinInterval()` for time overlap checks

## State Management: React Context + Tanstack Query

- **Server state** (events, profile, chat): Tanstack Query (or SWR) for caching, revalidation, optimistic updates
- **Client state** (filters, map viewport, UI toggles): React Context or useState
- No Redux/Zustand needed — keep it simple

### Alternative: just fetch + revalidate
For hackathon simplicity, we can use Next.js `fetch()` with `revalidatePath()` and Supabase Realtime for live updates instead of adding Tanstack Query. Decision at implementation time based on complexity.

## Authentication: Supabase Auth

- Providers: Google OAuth, GitHub OAuth
- Session: cookie-based, 30-day expiry
- Middleware refreshes session on every request
- `@supabase/ssr` package for server-side auth in App Router

## Database: Supabase Postgres + PostGIS

- PostGIS for geospatial queries (proximity search with spatial indexes)
- RLS for row-level security (data isolation)
- Realtime enabled on events, chat_messages, event_participants tables
- Edge Functions for cron jobs (archive events, send reminders)

## Deployment: Vercel

- Automatic deploys on git push
- Preview deployments per PR
- Edge runtime for API routes (low latency)
- Analytics for Core Web Vitals

## Project Structure (Updated)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── (protected)/
│   │   ├── map/page.tsx              # Main map view
│   │   ├── create/page.tsx           # Create event form
│   │   ├── event/[id]/page.tsx       # Event detail + chat
│   │   ├── profile/page.tsx          # Own profile
│   │   ├── profile/[id]/page.tsx     # View other profile
│   │   ├── history/page.tsx          # Event history
│   │   └── settings/page.tsx         # Notification prefs
│   ├── manifest.ts                   # PWA manifest
│   ├── layout.tsx
│   └── page.tsx                      # Landing page
├── components/
│   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── drawer.tsx
│   │   ├── ... (all shadcn components)
│   ├── MapView.tsx                   # Leaflet map (client component)
│   ├── EventMarker.tsx               # Custom map marker
│   ├── EventCard.tsx                 # Event detail in drawer
│   ├── EventForm.tsx                 # Create/edit event
│   ├── ChatPanel.tsx                 # Real-time chat
│   ├── FilterPanel.tsx               # Map filters in sheet
│   ├── ParticipantList.tsx           # Event participants
│   ├── ReputationBadge.tsx           # Score with color
│   ├── NowBadge.tsx                  # Pulsing NOW indicator
│   ├── BottomNav.tsx                 # Mobile tab bar
│   └── ProfileForm.tsx               # Profile setup/edit
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── geo.ts                        # Geolocation helpers
│   ├── reputation.ts                 # Score calculation
│   └── utils.ts                      # cn() helper, etc.
├── hooks/
│   ├── useGeolocation.ts
│   ├── useEvents.ts
│   ├── useChat.ts
│   └── useNotifications.ts
└── types/
    └── index.ts
```

## Key Differences from Previous Design Doc

| Before | After | Why |
|--------|-------|-----|
| Next.js 14 | Next.js 15 | Current stable, Turbopack default, better PWA support |
| next-pwa | Serwist (or native SW) | next-pwa is unmaintained, incompatible with Turbopack |
| Raw Tailwind only | shadcn/ui + Tailwind | Accessible components, faster dev, consistent design |
| Mapbox GL | Leaflet (default) + Mapbox (optional) | Free for hackathon, no API key needed |
| Custom form handling | react-hook-form + zod + shadcn Form | Industry standard, less boilerplate |
| No state library | Consider Tanstack Query for server state | Better caching, optimistic updates |

## Design Tokens (tailwind.config)

```javascript
// Custom colors for Rally
colors: {
  rally: {
    primary: '#6366F1',    // Indigo - main brand
    secondary: '#EC4899',  // Pink - NOW mode accent
    success: '#10B981',    // Green - reputation good
    warning: '#F59E0B',    // Yellow - reputation medium
    danger: '#EF4444',     // Red - reputation bad / urgent
  }
}
```

## Sources
- [shadcn/ui official docs](https://ui.shadcn.com/)
- [Next.js 15 PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist docs](https://serwist.pages.dev/docs/next/getting-started)
- [shadcn/ui mobile drawer patterns](https://www.shadcn.io/drawer-examples)
- [Leaflet + React in Next.js](https://react-leaflet.js.org/)
- [Mapbox GL vs Leaflet comparison](https://kindatechnical.com/data-visualization/mapbox-vs-leaflet-vs-google-maps-for-data-visualization.html)
