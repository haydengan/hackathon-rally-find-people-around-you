---
inclusion: fileMatch
fileMatchPattern: "**/*.test.{ts,tsx}"
---

# Testing Strategy

## Test Framework
- Use Vitest for unit and integration tests
- Use React Testing Library for component tests
- Use Playwright for E2E tests (critical user flows only)

## What to Test
- **Unit tests**: lib/reputation.ts, lib/geo.ts, Zod validation schemas
- **Component tests**: EventForm, FilterPanel, ChatPanel, ReputationBadge
- **Integration tests**: API routes with mocked Supabase client
- **E2E tests**: Auth flow, create event flow, join event flow

## Test File Naming
- Co-locate tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
- API route tests: `__tests__/api/endpoint.test.ts`
- E2E tests: `e2e/flow-name.spec.ts`

## Testing Patterns
```typescript
// Component test example
import { render, screen, fireEvent } from '@testing-library/react';
import { EventForm } from './EventForm';

describe('EventForm', () => {
  it('should auto-enable NOW mode when start time is within 2 hours', () => {
    render(<EventForm onSubmit={jest.fn()} />);
    const dateInput = screen.getByLabelText('Start Time');
    const nowTime = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    fireEvent.change(dateInput, { target: { value: nowTime } });
    expect(screen.getByLabelText('NOW Mode')).toBeChecked();
  });
});

// Reputation unit test
import { calculateReputation } from './reputation';

describe('calculateReputation', () => {
  it('should return 100 for user with only attendance', () => {
    expect(calculateReputation(5, 0)).toBe(100); // capped at 100
  });

  it('should deduct 15 per no-show', () => {
    expect(calculateReputation(0, 2)).toBe(70); // 100 - 30
  });

  it('should never go below 0', () => {
    expect(calculateReputation(0, 10)).toBe(0);
  });
});
```

## Coverage Goals
- Utility functions (reputation, geo): 90%+
- API routes: 80%+
- Components: 70%+
- E2E: Cover 3 critical flows (auth, create event, join event)

## Geolocation Testing
- Mock `navigator.geolocation` in component tests
- Use fixed coordinates for deterministic distance calculations
- Test permission denied scenario (fallback to manual input)
