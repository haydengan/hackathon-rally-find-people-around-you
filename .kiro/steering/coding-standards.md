---
inclusion: fileMatch
fileMatchPattern: "**/*.{ts,tsx}"
---

# TypeScript & Next.js Coding Standards

## TypeScript Rules
- Use strict mode with no `any` types — always define proper interfaces
- Prefer `interface` over `type` for object shapes
- Use Zod schemas for runtime validation at API boundaries
- Export types from `types/index.ts` — single source of truth
- Use const assertions for predefined lists (activity types, skill levels)

## Next.js App Router Patterns
- Server Components by default, add `'use client'` only when needed (interactivity, hooks, browser APIs)
- Use `route.ts` for API endpoints with proper HTTP method exports
- Use `loading.tsx` and `error.tsx` for loading/error states
- Metadata exports for SEO on each page
- Use route groups `(auth)` and `(protected)` for layout separation

## Component Guidelines
- One component per file, named same as file (PascalCase)
- Props interface defined above component: `interface ComponentNameProps {}`
- Use `cn()` utility (clsx + tailwind-merge) for conditional classes
- Destructure props in function signature
- Keep components under 150 lines — extract sub-components if larger
- Map-related components must handle loading/error states for geolocation

## API Route Pattern
```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({ /* fields */ });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const validated = schema.parse(body);

    // Business logic here

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## Supabase Patterns
- Always check auth before database operations
- Use RLS as primary access control, API checks as defense-in-depth
- Use `.select()` with specific columns, never `select('*')` in production
- Handle Supabase errors: check `error` property on responses
- Use PostGIS functions (ST_DWithin, ST_Distance, ST_MakePoint) for location queries
- Always cast to geography type for accurate distance: `::geography`

## shadcn/ui Patterns
- Components live in `components/ui/` — auto-generated via CLI, don't manually edit
- Custom app components live in `components/` (not in `ui/`)
- Use shadcn Form component with react-hook-form + zod for all forms
- Use Drawer (bottom sheet) for mobile event details on map tap
- Use Sheet for slide-in filter panel
- Use Command for location search with autocomplete
- Use Toast for success/error feedback (joined, left, created)
- Always use shadcn Badge for tags: activity type, skill level, NOW indicator
- Import from `@/components/ui/button` not from a package

## Tailwind Conventions
- Mobile-first: write base styles for mobile, add `md:` and `lg:` for larger screens
- Use design tokens from tailwind.config (colors, spacing) not arbitrary values
- Rally brand colors: `rally-primary` (indigo), `rally-secondary` (pink for NOW mode)
- Common card pattern: `rounded-xl shadow-sm border border-gray-200 p-4`
- NOW mode pulse: custom keyframes with `animate-now-pulse` class
- Dark mode support via `dark:` prefix (optional for hackathon)

## Map Component Patterns
- Map is always loaded with `dynamic(() => import(), { ssr: false })` — Leaflet needs window
- Show `<Skeleton>` while map loads
- Map takes full viewport on mobile (h-[calc(100vh-64px)] minus bottom nav)
- Event markers use custom icons per Activity_Type
- Bottom Drawer overlays map for event details (doesn't navigate away)

## Geolocation Patterns
- Always handle permission denied gracefully (fallback to manual search via Command)
- Cache user location in state, don't re-request on every render
- Use `navigator.geolocation.watchPosition` for continuous updates on map page
- Display distances in km (1 decimal place) for events

## Form Patterns (react-hook-form + zod + shadcn)
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';

const form = useForm<EventFormData>({
  resolver: zodResolver(eventSchema),
  defaultValues: { title: '', activity_type: '', ... }
});

// In JSX:
<Form {...form}>
  <FormField control={form.control} name="title" render={({ field }) => (
    <FormItem>
      <FormLabel>Title</FormLabel>
      <FormControl><Input {...field} /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
</Form>
```
