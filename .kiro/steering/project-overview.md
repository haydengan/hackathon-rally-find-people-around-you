# Rally — Set Your Schedule, We Find Your People

## Project Summary
Rally is a PWA that auto-matches nearby people who want to do the same activity at the same time. Set your availability → system finds matches within your travel distance → event auto-created → just show up. Also supports manual event creation and discovery via map/calendar.

## Core Pain Points Solved
1. **No friends who play this** — new to city, new hobby, friends aren't into it
2. **Friends always busy** — can't coordinate schedules, messages ignored
3. **Venues too far** — travel distance matters, people won't go 30min away

## Core Solution: Auto-Match
1. User sets availability: activity + days/times + max travel distance + min people
2. System finds other users with overlapping availability within travel range
3. When min people reached → auto-creates public event + suggests venue + sends invitations
4. Users accept and show up

## Secondary Features
- **Map Discovery** — browse nearby events on an interactive map
- **Explore Calendar** — heatmap showing which days have most events
- **Manual Event Creation** — create events directly if you know what/when/where
- **Real-time Chat** — group chat per event for coordination
- **Follow + DM** — connect with people you've played with
- **Time-based Tags** — 🔴 Live (happening now), ⚡ Starting Soon (within 1hr)

## Tech Stack
- **Framework**: Next.js 15+ (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **Map**: Leaflet + React Leaflet + OpenStreetMap
- **Backend**: Supabase (Auth, Postgres + PostGIS, Realtime)
- **Deployment**: Vercel

## Activity Types (35+)
Sports, fitness, outdoor, social, creative, gaming, dance — covering all popular activities in Singapore.

## Key Architecture Decisions
- PostGIS for geospatial proximity matching
- Auto-match runs on every availability save (serverless, no cron needed)
- Events are always public — anyone can join, not just invitees
- Supabase Realtime for live chat and event updates
