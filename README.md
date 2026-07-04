# Rally — Set Your Schedule, We Find Your People

Can't find people to play with? Friends always busy? Courts too far? Rally auto-matches you with nearby people who want the same activity at the same time — then creates the event for you.

## How It Works

1. **Set Availability** — Pick your activity, when you're free, max travel distance, and min people needed
2. **Auto-Match** — Rally finds nearby people with overlapping schedule and creates the event
3. **Get Invited** — Everyone gets notified. Accept and coordinate via group chat
4. **Show Up & Play** — No organizing needed. Just be there.

## Features

- 🤖 **Auto-Matching** — System finds people for you based on activity + time + proximity
- 🗺️ **Map Discovery** — Browse nearby events on an interactive 2D map
- 📅 **Explore Calendar** — Heatmap showing which days have most events
- ➕ **Create Events** — Manually host events that anyone nearby can join
- 💬 **Real-time Chat** — Group chat per event for coordination
- ⚡ **Time Tags** — 🔴 Live (happening now), ⚡ Starting Soon (within 1hr)
- 👥 **Follow + DM** — Connect with people you've played with
- 📱 **PWA** — Installable, works on any device

## Tech Stack

- **Framework**: Next.js 15+ (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **Map**: Leaflet + React Leaflet + OpenStreetMap
- **Backend**: Supabase (Auth, Postgres + PostGIS, Realtime)
- **Geospatial**: PostGIS for proximity-based auto-matching
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in Supabase credentials
4. Run the development server: `npm run dev`
5. Open http://localhost:3000

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Architecture

- **Auto-match runs on every availability save** — no cron jobs needed, instant matching
- **PostGIS** — spatial indexes for sub-millisecond proximity queries
- **Supabase Realtime** — live chat, participant updates, event changes
- **Events are public** — auto-created events show on map for anyone to join
- **35+ activity types** — sports, fitness, social, creative, gaming, outdoor

## License

MIT
