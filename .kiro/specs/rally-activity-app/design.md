# Design Document

## Overview

Rally is a Progressive Web App built with Next.js 15 (App Router), shadcn/ui for the component system, Supabase for backend services (Auth, Postgres with PostGIS, Realtime, Edge Functions), and deployed on Vercel. The architecture is serverless-first with real-time capabilities for live event updates, chat, and proximity-based notifications. The frontend uses Tailwind CSS + shadcn/ui for design system components and Leaflet (react-leaflet) for the interactive 2D map.

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser/PWA)                     │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 App Router                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Auth    │ │  Map     │ │  Event   │ │  Chat            │   │
│  │  Pages   │ │  View    │ │  Create  │ │  (Realtime)      │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Service Worker (Offline cache, Background Sync, Push)   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────┬───────────────────────┘
                                          │ HTTPS / WebSocket
┌─────────────────────────────────────────▼───────────────────────┐
│                      VERCEL EDGE / API ROUTES                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ /api/    │ │ /api/    │ │ /api/    │ │ /api/            │   │
│  │ events   │ │ join     │ │ chat     │ │ notifications    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
┌─────────────────────────────────────────▼───────────────────────┐
│                         SUPABASE                                 │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   Auth   │ │   Postgres   │ │ Realtime │ │  Edge Funcs  │   │
│  │  (OAuth) │ │  + PostGIS   │ │   (WS)   │ │  (Cron/Push) │   │
│  └──────────┘ └──────────────┘ └──────────┘ └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group (public)
│   │   ├── login/page.tsx        # Login with OAuth buttons
│   │   └── callback/route.ts     # OAuth callback handler
│   ├── (protected)/              # Authenticated routes
│   │   ├── map/page.tsx          # Main map view (home)
│   │   ├── create/page.tsx       # Create event form
│   │   ├── event/[id]/page.tsx   # Event detail + chat
│   │   ├── profile/page.tsx      # Own profile / edit
│   │   ├── profile/[id]/page.tsx # View other user's profile
│   │   ├── history/page.tsx      # Past events
│   │   └── settings/page.tsx     # Notification preferences
│   ├── layout.tsx                # Root layout with nav
│   └── page.tsx                  # Landing page (public)
├── components/
│   ├── MapView.tsx               # Mapbox GL 2D map with markers
│   ├── EventMarker.tsx           # Individual event pin on map
│   ├── EventCard.tsx             # Event detail overlay/card
│   ├── EventForm.tsx             # Create/edit event form
│   ├── NowBadge.tsx              # Pulsing NOW indicator
│   ├── ChatPanel.tsx             # Real-time group chat
│   ├── ChatMessage.tsx           # Single chat message
│   ├── ParticipantList.tsx       # List of event participants
│   ├── FilterPanel.tsx           # Map filter controls
│   ├── ReputationBadge.tsx       # Score display with color
│   ├── ProfileForm.tsx           # Profile setup/edit
│   ├── NotificationBell.tsx      # In-app notification center
│   └── BottomNav.tsx             # Mobile bottom navigation
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Auth middleware
│   ├── geo.ts                    # Geolocation utilities
│   ├── reputation.ts             # Reputation score calculator
│   └── notifications.ts         # Push notification helpers
├── hooks/
│   ├── useEvents.ts              # Events data + realtime
│   ├── useChat.ts                # Chat messages + realtime
│   ├── useGeolocation.ts         # Browser geolocation hook
│   ├── useProfile.ts             # Profile data hook
│   └── useNotifications.ts       # Push subscription hook
└── types/
    └── index.ts                  # TypeScript interfaces
```

## Data Models

### Database Schema (Supabase Postgres + PostGIS)

```sql
-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name VARCHAR(40) NOT NULL,
  bio VARCHAR(160),
  avatar_url VARCHAR(500),
  preferred_activities TEXT[] DEFAULT '{}',
  reputation_score INT DEFAULT 100 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  events_attended INT DEFAULT 0,
  events_created INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles(id) NOT NULL,
  title VARCHAR(80) NOT NULL,
  description VARCHAR(500),
  activity_type VARCHAR(30) NOT NULL,
  skill_level VARCHAR(20) DEFAULT 'any' CHECK (skill_level IN ('beginner', 'intermediate', 'pro', 'any')),
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  location_name VARCHAR(200) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  total_spots INT NOT NULL CHECK (total_spots >= 2 AND total_spots <= 50),
  spots_taken INT DEFAULT 1,  -- Creator counts as 1
  min_participants INT DEFAULT 2,
  cost_per_person NUMERIC(6,2) DEFAULT 0,
  is_now BOOLEAN DEFAULT FALSE,
  min_reputation INT DEFAULT 0 CHECK (min_reputation >= 0 AND min_reputation <= 80),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'full', 'cancelled', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Participants
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN,  -- NULL = not yet confirmed, TRUE = showed up, FALSE = no-show
  UNIQUE(event_id, user_id)
);

-- Chat Messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) <= 1000),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  type VARCHAR(30) NOT NULL,  -- 'now_nearby', 'event_reminder', 'event_modified', 'new_participant', 'event_cancelled'
  title VARCHAR(200) NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Push Subscriptions (for browser push notifications)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  subscription JSONB NOT NULL,  -- PushSubscription object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subscription)
);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  now_broadcasts BOOLEAN DEFAULT TRUE,
  event_reminders BOOLEAN DEFAULT TRUE,
  quiet_hours_start TIME,  -- e.g., '22:00'
  quiet_hours_end TIME,    -- e.g., '08:00'
  activity_filters TEXT[] DEFAULT '{}',  -- empty = all activities
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_events_location ON events USING GIST (location);
CREATE INDEX idx_events_activity_type ON events (activity_type);
CREATE INDEX idx_events_starts_at ON events (starts_at);
CREATE INDEX idx_events_status ON events (status);
CREATE INDEX idx_events_is_now ON events (is_now) WHERE is_now = TRUE;
CREATE INDEX idx_participants_event ON event_participants (event_id);
CREATE INDEX idx_participants_user ON event_participants (user_id);
CREATE INDEX idx_chat_event ON chat_messages (event_id, created_at);
CREATE INDEX idx_notifications_user ON notifications (user_id, read, created_at);
```

### TypeScript Interfaces

```typescript
interface Profile {
  id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  preferred_activities: string[];
  reputation_score: number;
  events_attended: number;
  events_created: number;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  creator_id: string;
  title: string;
  description?: string;
  activity_type: string;
  skill_level: 'beginner' | 'intermediate' | 'pro' | 'any';
  location: { lat: number; lng: number };
  location_name: string;
  starts_at: string;
  total_spots: number;
  spots_taken: number;
  min_participants: number;
  cost_per_person: number;
  is_now: boolean;
  min_reputation: number;
  status: 'active' | 'full' | 'cancelled' | 'completed' | 'archived';
  created_at: string;
  // Joined data
  creator?: Profile;
  participants?: Participant[];
  distance_km?: number;  // Calculated client-side or via PostGIS
}

interface Participant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  attended?: boolean;
  profile?: Profile;
}

interface ChatMessage {
  id: string;
  event_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

interface Notification {
  id: string;
  user_id: string;
  type: 'now_nearby' | 'event_reminder' | 'event_modified' | 'new_participant' | 'event_cancelled';
  title: string;
  body?: string;
  metadata: Record<string, any>;
  read: boolean;
  created_at: string;
}

interface MapFilters {
  activity_types: string[];
  skill_level?: string;
  day_of_week?: number;  // 0-6
  free_only: boolean;
  radius_km: number;     // 1, 2, 5, 10, 25, 50
}

interface EventFormData {
  title: string;
  description?: string;
  activity_type: string;
  skill_level: string;
  location: { lat: number; lng: number };
  location_name: string;
  starts_at: string;
  total_spots: number;
  min_participants: number;
  cost_per_person: number;
  is_now: boolean;
  min_reputation: number;
}
```

## API Design

### REST API Routes (Next.js API Routes)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/profile | Get current user's profile |
| PUT | /api/profile | Update profile |
| POST | /api/profile/setup | Initial profile creation |
| GET | /api/profile/[id] | Get another user's public profile |
| GET | /api/events | Get events near location (with filters) |
| POST | /api/events | Create a new event |
| GET | /api/events/[id] | Get event details with participants |
| PUT | /api/events/[id] | Update event (creator only) |
| DELETE | /api/events/[id] | Cancel event (creator only) |
| POST | /api/events/[id]/join | Join an event |
| DELETE | /api/events/[id]/leave | Leave an event |
| POST | /api/events/[id]/attendance | Mark attendance (creator only) |
| GET | /api/events/[id]/chat | Get chat messages (paginated) |
| POST | /api/events/[id]/chat | Send a chat message |
| GET | /api/notifications | Get user's notifications |
| PUT | /api/notifications/read | Mark notifications as read |
| GET | /api/history | Get user's event history |
| POST | /api/push/subscribe | Register push subscription |
| DELETE | /api/push/subscribe | Unregister push subscription |
| GET | /api/settings/notifications | Get notification preferences |
| PUT | /api/settings/notifications | Update notification preferences |

### Geospatial Query (Events near location)

```sql
-- Find events within X km of a point
SELECT *, ST_Distance(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography) / 1000 as distance_km
FROM events
WHERE status = 'active'
  AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography, $radius_meters)
  AND starts_at > NOW()
ORDER BY is_now DESC, starts_at ASC;
```

### Realtime Subscriptions (Supabase Realtime)

```typescript
// Subscribe to new/updated events in view (for map live updates)
supabase.channel('events')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'events',
    filter: `status=eq.active`
  }, handleEventChange)
  .subscribe();

// Subscribe to chat messages for a specific event
supabase.channel(`chat:${eventId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `event_id=eq.${eventId}`
  }, handleNewMessage)
  .subscribe();

// Subscribe to participant changes for an event
supabase.channel(`participants:${eventId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'event_participants',
    filter: `event_id=eq.${eventId}`
  }, handleParticipantChange)
  .subscribe();
```

## Key Technical Decisions

### Map Implementation
- **Library**: Leaflet + react-leaflet (free, no API key, BSD license)
- **Alternative**: Mapbox GL JS via react-map-gl if we need vector tiles later
- **SSR handling**: `dynamic(() => import(), { ssr: false })` since Leaflet requires window/document
- **Markers**: Custom HTML markers with Activity_Type icons, CSS animations for NOW events
- **Clustering**: Supercluster for grouping nearby markers at low zoom levels
- **Geolocation**: Browser Geolocation API with fallback to address search via Nominatim (free geocoding)
- **Tiles**: OpenStreetMap (free) or Mapbox (if API key available)

### UI Component System
- **Library**: shadcn/ui (components copied into project, built on Radix UI + Tailwind)
- **Mobile patterns**: Drawer (bottom sheet for event details), Sheet (filter panel), Command (location search)
- **Forms**: react-hook-form + zod + shadcn Form component (industry standard)
- **Accessibility**: Radix primitives provide WCAG compliance by default (focus management, aria attributes)
- **Theming**: Tailwind design tokens in tailwind.config with Rally brand colors

### PostGIS for Proximity
- PostGIS extension enables spatial indexing (GIST) and distance queries
- `ST_DWithin` for "events within X meters" — uses spatial index, very fast
- `ST_Distance` for computing exact distance to display on cards
- Geography type (not Geometry) for accurate Earth-surface distance calculations

### NOW Mode Implementation
- On event creation: if `starts_at` is within 2 hours, `is_now = true`
- Supabase Edge Function triggered on INSERT to `events` WHERE `is_now = true`:
  - Queries users within 5km whose `preferred_activities` match
  - Sends push notification via Web Push API
  - If 30 min before start and `spots_taken < min_participants`, expands to 10km

### Real-time Chat
- Supabase Realtime (WebSocket) for live message delivery
- Messages persisted in `chat_messages` table
- Client subscribes to channel on event detail page mount
- Unsubscribes on unmount to prevent memory leaks

### Reputation Algorithm
```typescript
function calculateReputation(attended: number, noShows: number, recentNoShows: number): number {
  const baseScore = 100;
  const totalPenalty = noShows * 15;
  const recentBonus = 0; // recent no-shows already counted in noShows
  const attendanceBonus = Math.min(attended * 5, 50); // cap bonus
  return Math.max(0, Math.min(100, baseScore - totalPenalty + attendanceBonus));
}
```

### PWA Strategy
- **Service Worker**: Serwist (@serwist/next) — maintained successor to next-pwa, works with Turbopack
- **Manifest**: `app/manifest.ts` (Next.js 15 native support)
- **Cache**: NetworkFirst for API, CacheFirst for static assets and map tiles
- **Offline**: IndexedDB stores profile, joined events, map tile cache
- **Push**: Web Push API via service worker for NOW broadcasts and reminders
- **Background Sync**: Queue event creation and join actions offline, replay on reconnect

### Authentication Flow
```
User clicks "Sign in with Google/GitHub"
  → Supabase Auth redirects to provider
  → Provider authenticates → callback to /auth/callback
  → Supabase creates session (30-day expiry)
  → Middleware checks session on protected routes
  → No profile? → Redirect to /profile/setup
  → Has profile? → Redirect to /map
```

## External Dependencies

| Package | Purpose | License |
|---------|---------|---------|
| next@15 | Framework (App Router, RSC, Turbopack) | MIT |
| @supabase/supabase-js | Backend client | MIT |
| @supabase/ssr | Server-side auth for App Router | MIT |
| tailwindcss | Styling foundation | MIT |
| shadcn/ui | Component system (Radix + Tailwind) | MIT |
| react-hook-form | Form state management | MIT |
| @hookform/resolvers | Zod integration for react-hook-form | MIT |
| leaflet + react-leaflet | 2D map (free, no API key) | BSD-2 |
| supercluster | Marker clustering | ISC |
| @serwist/next + serwist | PWA service worker (successor to next-pwa) | MIT |
| zod | Schema validation | MIT |
| date-fns | Date utilities | MIT |
| lucide-react | Icons | ISC |
| web-push | Push notifications (server) | MIT |
| vaul | Drawer component (used by shadcn Drawer) | MIT |
| @radix-ui/* | Headless UI primitives (used by shadcn) | MIT |
| clsx + tailwind-merge | Conditional class utility (cn helper) | MIT |

## Components and Interfaces

### Core Components

| Component | Type | Props/Interface | Responsibility |
|-----------|------|----------------|----------------|
| MapView | Client | `{ events: Event[]; filters: MapFilters; userLocation: LatLng }` | Renders 2D map with event markers, handles zoom/pan, marker clustering |
| EventMarker | Client | `{ event: Event; onClick: () => void }` | Single map marker with Activity_Type icon, NOW pulse animation |
| EventCard | Client | `{ event: Event; onJoin: () => void; onClose: () => void }` | Overlay card showing event details and join button |
| EventForm | Client | `{ onSubmit: (data: EventFormData) => void; initialData?: Partial<EventFormData> }` | Create/edit event form with map pin location picker |
| NowBadge | Client | `{ size?: 'sm' \| 'md' \| 'lg' }` | Animated pulsing badge for NOW events |
| ChatPanel | Client | `{ eventId: string; userId: string }` | Real-time chat with message list and input |
| ChatMessage | Client | `{ message: ChatMessage; isOwn: boolean }` | Single message bubble |
| ParticipantList | Client | `{ participants: Participant[]; creatorId: string }` | List of event participants with reputation badges |
| FilterPanel | Client | `{ filters: MapFilters; onChange: (filters: MapFilters) => void }` | Collapsible filter controls for map |
| ReputationBadge | Client | `{ score: number; size?: 'sm' \| 'md' }` | Color-coded reputation display |
| ProfileForm | Client | `{ profile?: Profile; mode: 'create' \| 'edit' }` | Profile setup and editing |
| NotificationBell | Client | `{ count: number; onClick: () => void }` | Header notification indicator |
| BottomNav | Client | `{ activeTab: string }` | Mobile bottom navigation (Map, Create, History, Profile) |

### Service Interfaces

```typescript
// lib/geo.ts
interface GeoService {
  getCurrentPosition(): Promise<{ lat: number; lng: number }>;
  calculateDistance(from: LatLng, to: LatLng): number;  // km
  isWithinRadius(point: LatLng, center: LatLng, radiusKm: number): boolean;
}

// lib/reputation.ts
interface ReputationService {
  calculateScore(attended: number, noShows: number): number;
  getColor(score: number): 'green' | 'yellow' | 'red';
  canJoinEvent(userScore: number, eventMinReputation: number): boolean;
}

// lib/notifications.ts
interface NotificationService {
  sendPush(userId: string, title: string, body: string, data?: object): Promise<void>;
  sendNowBroadcast(event: Event, targetUserIds: string[]): Promise<void>;
  scheduleReminder(eventId: string, userId: string, reminderAt: Date): Promise<void>;
}
```

### Hook Interfaces

```typescript
// hooks/useEvents.ts
function useEvents(filters: MapFilters, location: LatLng): {
  events: Event[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

// hooks/useChat.ts
function useChat(eventId: string): {
  messages: ChatMessage[];
  sendMessage: (content: string) => Promise<void>;
  loading: boolean;
};

// hooks/useGeolocation.ts
function useGeolocation(): {
  location: { lat: number; lng: number } | null;
  loading: boolean;
  error: string | null;
  requestPermission: () => void;
};

// hooks/useNotifications.ts
function useNotifications(): {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (ids: string[]) => void;
  subscribeToPush: () => Promise<void>;
};
```

## Error Handling

### Client-Side
- **Form validation**: Inline field-level errors via Zod
- **Network errors**: Toast notification with retry, queue failed mutations for background sync
- **Auth errors**: Redirect to login, handle OAuth cancellation gracefully
- **Geolocation errors**: Fallback to manual address search, display explanation
- **Map errors**: Fallback to list view if map fails to load

### Server-Side
- **400 (Validation)**: Return Zod error details as `{ error: ZodError[] }`
- **401 (Unauthorized)**: Return `{ error: 'Unauthorized' }`, clear invalid session
- **403 (Forbidden)**: Return `{ error: 'Insufficient reputation' }` or similar
- **404 (Not Found)**: Return `{ error: 'Event not found' }`
- **409 (Conflict)**: Return `{ error: 'Event is full' }` or `{ error: 'Already joined' }`
- **429 (Rate Limit)**: Return `{ error: 'NOW event limit reached (3/day)' }`
- **500 (Server)**: Log full error, return generic `{ error: 'Internal server error' }`

### Offline Recovery
- Queue failed POST/PUT in IndexedDB with timestamp
- On reconnect: replay in order, max 3 retries at 5s intervals
- After 3 failures: mark permanently failed, show notification
- Display "Last synced: X min ago" for cached data

## Correctness Properties

### Property 1: Spot Count Consistency
`spots_taken` always equals the count of rows in `event_participants` for that event. Enforced via database trigger on INSERT/DELETE to `event_participants`.

**Validates: Requirements 3.5, 6.1**

### Property 2: NOW Event Rate Limiting
A user cannot create more than 3 NOW_Events in any rolling 24-hour window. API validates by counting events with `is_now = true AND creator_id = user AND created_at > NOW() - INTERVAL '24 hours'`.

**Validates: Requirements 4.6**

### Property 3: Reputation Bounds
Reputation_Score is always an integer in [0, 100]. Attendance adds 5 (capped at 100), no-shows deduct 15 (floored at 0).

**Validates: Requirements 7.1, 7.3, 7.4**

### Property 4: Event Lifecycle
Events transition: active → full (when spots_taken = total_spots) → completed (past start time + creator confirms) → archived (24h after completion). Events can also go active → cancelled at any time by creator.

**Validates: Requirements 3.5, 3.6, 3.7**

### Property 5: No Overlapping Joins
A user cannot be a participant in more than 5 events with overlapping time windows. API checks existing participations before allowing join.

**Validates: Requirements 6.8**

## Testing Strategy

### Unit Tests (Vitest)
- `lib/reputation.ts`: Score boundaries, no-show penalty, attendance bonus
- `lib/geo.ts`: Distance calculations, radius checks
- Zod schemas: Valid/invalid inputs for all API request bodies

### Component Tests (React Testing Library)
- EventForm: Validation, NOW toggle behavior, location picker
- FilterPanel: Filter state management, clear filters
- ChatPanel: Message display, send action
- ReputationBadge: Color coding thresholds

### Integration Tests
- API routes: Mock Supabase, test full request → response
- Auth flow: Redirect logic, session handling
- Realtime: Subscription setup, event handling

### E2E Tests (Playwright)
- Auth → profile setup → map view
- Create event → appears on map → another user joins
- NOW event → notification received

### Performance Tests
- Map with 100 markers: smooth pan/zoom at 30fps
- LCP < 3s on throttled 4G
- Chat message delivery < 2s end-to-end
