# Requirements Document

## Introduction

Rally is a Progressive Web App (PWA) that enables spontaneous, real-time activity matching with nearby people. Instead of joining dozens of groups, posting in chats, or scheduling events weeks ahead, Rally lets users broadcast their intent ("I want to play basketball, now, within 2km") and instantly discover others nearby who want the same thing.

Deployed on Vercel and built with Next.js + Supabase, Rally eliminates the friction of organizing spontaneous activities — no groups to join, no posts to scroll, no waiting for replies. Just open the app, state what you want to do, and find your people.

## PRFAQ Context (Working Backwards)

### Who is the customer?
University students, young professionals, and active individuals aged 18-35 who want to play sports, attend hackathons, find study buddies, or do any group activity but lack a reliable, real-time way to find nearby participants.

### What is the customer problem?
Organizing spontaneous group activities is unreasonably hard. You message your WhatsApp group — 3 people seen, nobody replies. You post on Telegram — buried in 200 messages. Check Meetup — next game is in 2 weeks. Facebook groups — mostly spam. The friction is scattered across 10 platforms, none work in real-time, and you need to already BE in the right group. Result: you give up and stay home.

### What is the most important customer benefit?
Instant discovery of nearby people who want to do the same activity right now — no groups, no posting, no waiting, no scrolling. The "Uber for activities" experience: open app → see who's nearby → join → go.

### How do you know what customers need?
University students and young professionals consistently cite "not having enough people" as the #1 barrier to spontaneous sports and activities. Existing solutions (Meetup, Playo, Facebook Groups) solve for scheduled events, not real-time needs. The gap between "I want to play NOW" and "finding people NOW" remains unsolved.

### What does the experience look like?
Open Rally → Create an event ("Basketball, Today 7pm, Court X, need 4 more, intermediate level, $5 each for court rental") → It appears on the 2D map → Others nearby see it, filter by sport/day/distance → Join with one tap → Group chat auto-creates → Play.

## Glossary

- **Rally_App**: The Rally PWA web application accessible via mobile and desktop browsers
- **User**: An authenticated individual who has created a Rally profile
- **Event**: A user-created activity listing with details (what, when, where, spots, level, cost)
- **NOW_Event**: An urgent Event happening within 2 hours, displayed with special visual effects and triggering proximity broadcasts
- **Activity_Type**: Category of the event (Sports, Hackathon, Study, Social, Fitness, Creative, Gaming, Other)
- **Skill_Level**: Participant competency indicator (Beginner, Intermediate, Pro, Any)
- **Map_View**: The 2D interactive map showing Events as markers/pins with filtering capabilities
- **Spot**: A single open participant position in an Event (e.g., "3 spots left" means 3 more people needed)
- **Rally_Chat**: Auto-created group chat for confirmed Event participants
- **Proximity_Broadcast**: Push notification sent to users within a defined radius when a NOW_Event is created
- **Reputation_Score**: A reliability metric (0-100) based on attendance history, penalizing no-shows
- **No_Show**: When a joined participant fails to attend without cancelling at least 1 hour before the Event start time

## Requirements

### Requirement 1: User Authentication

**User Story:** As a potential participant, I want to sign up and log in quickly so I can start finding nearby activities immediately.

#### Acceptance Criteria

1. WHEN a new visitor accesses Rally_App, THE Rally_App SHALL display options to authenticate via Google OAuth or GitHub OAuth through Supabase Auth within 3 seconds of page load
2. WHEN a User authenticates successfully, THE Rally_App SHALL create a session and redirect the User to the Profile setup page if no profile exists, or to the Map_View if a profile exists, within 2 seconds
3. IF authentication fails due to provider error or network timeout, THEN THE Rally_App SHALL display an error message indicating the failure reason and allow retry without re-entering any previously provided information
4. THE Rally_App SHALL maintain the authenticated session for 30 days before requiring re-authentication
5. IF the User cancels the OAuth flow at the provider, THEN THE Rally_App SHALL return the User to the authentication options screen without displaying an error

### Requirement 2: User Profile

**User Story:** As a user, I want to set up my profile with my interests and preferred activities so others can see who's joining their event.

#### Acceptance Criteria

1. WHEN a User accesses Profile setup for the first time, THE Rally_App SHALL require: display name (2-40 characters), and at least one preferred Activity_Type selected from the predefined list
2. THE Rally_App SHALL allow a User to optionally provide: bio (max 160 characters), profile photo (uploaded or from OAuth provider), and preferred Skill_Level defaults per Activity_Type
3. WHEN a User saves their profile, THE Rally_App SHALL persist changes within 3 seconds and display a success notification
4. THE Rally_App SHALL display the User's Reputation_Score on their profile, visible to other users
5. WHEN a User views another User's profile (from an Event participant list), THE Rally_App SHALL show: display name, bio, preferred activities, Reputation_Score, and number of events attended
6. IF a profile save fails, THEN THE Rally_App SHALL display an error message and retain unsaved input

### Requirement 3: Create Event

**User Story:** As someone who wants to organize an activity, I want to create an event with all relevant details so nearby people can find and join it.

#### Acceptance Criteria

1. THE Rally_App SHALL allow a User to create an Event with the following required fields: title (5-80 characters), Activity_Type (selected from predefined list), date and time (must be in the future), location (selected via map pin or address search), and total spots available (2-50)
2. THE Rally_App SHALL allow optional Event fields: Skill_Level (Beginner/Intermediate/Pro/Any, defaults to "Any"), cost per person (numeric, $0-$500, defaults to $0 meaning free), description (max 500 characters), and minimum participants needed to confirm the event (2 to total spots)
3. WHEN a User creates an Event, THE Rally_App SHALL place a marker on the Map_View at the specified location within 2 seconds, visible to all users within 50km
4. THE Rally_App SHALL display on each Event marker/card: title, Activity_Type icon, time, spots remaining ("X/Y joined"), Skill_Level badge, and cost (if any)
5. WHEN an Event reaches its total spots, THE Rally_App SHALL mark it as "Full" and prevent further joins unless a participant leaves
6. WHEN an Event's date/time passes, THE Rally_App SHALL automatically archive it and remove it from the Map_View within 5 minutes
7. THE Rally_App SHALL allow the Event creator to edit or cancel their Event at any time before its start time, notifying all joined participants of changes or cancellation

### Requirement 4: NOW Mode (Urgent Events)

**User Story:** As someone who wants to do something RIGHT NOW, I want to create an urgent event that broadcasts to nearby people so I can find participants within minutes.

#### Acceptance Criteria

1. THE Rally_App SHALL provide a "NOW" toggle when creating an Event, automatically enabled when the Event start time is within 2 hours from creation time
2. WHEN a NOW_Event is created, THE Rally_App SHALL display it with a distinct pulsing/glowing visual effect on the Map_View, differentiating it from regular Events
3. WHEN a NOW_Event is created, THE Rally_App SHALL send a Proximity_Broadcast push notification to all users within the Event's Activity_Type preference AND within 5km radius, containing: activity title, distance from user, time, and spots remaining
4. THE Rally_App SHALL display NOW_Events with higher visual priority on the Map_View (larger markers, always on top of regular events)
5. WHEN a NOW_Event is within 30 minutes of its start time and has not reached minimum participants, THE Rally_App SHALL send a second Proximity_Broadcast to expand the radius to 10km
6. THE Rally_App SHALL limit each User to creating a maximum of 3 NOW_Events per day to prevent notification spam

### Requirement 5: Map Discovery

**User Story:** As someone looking for activities, I want to browse a map showing all nearby events so I can find something to join based on location, type, and timing.

#### Acceptance Criteria

1. THE Rally_App SHALL display a 2D interactive map (Mapbox GL or Leaflet) as the primary discovery interface, centered on the User's current location with a default zoom showing a 5km radius
2. THE Rally_App SHALL render each Event as a map marker with an icon representing its Activity_Type, where NOW_Events have a pulsing animation
3. THE Rally_App SHALL provide filter controls allowing users to filter Events by: Activity_Type (multi-select), day of week, Skill_Level, cost (free only toggle), and distance radius (1km, 2km, 5km, 10km, 25km, 50km)
4. WHEN a User taps/clicks an Event marker, THE Rally_App SHALL display an Event card overlay showing: title, Activity_Type, date/time, location name, spots remaining, Skill_Level, cost, creator's display name and Reputation_Score, and a "Join" button
5. THE Rally_App SHALL update Event markers in real-time (within 5 seconds) when new Events are created or existing Events fill up
6. THE Rally_App SHALL request the User's geolocation permission on first map load, and IF denied, allow manual location setting via address search
7. WHEN the Map_View loads, THE Rally_App SHALL display all active Events within the selected radius within 3 seconds

### Requirement 6: Join Event & Chat

**User Story:** As someone who found an interesting activity, I want to join with one tap and instantly connect with other participants to coordinate.

#### Acceptance Criteria

1. WHEN a User taps "Join" on an Event, THE Rally_App SHALL add them to the Event's participant list, decrement spots remaining by 1, and confirm with a success notification within 2 seconds
2. WHEN a User joins an Event, THE Rally_App SHALL automatically add them to the Rally_Chat for that Event
3. THE Rally_Chat SHALL support text messages, displaying sender name, message, and timestamp, with real-time delivery (within 2 seconds) to all participants
4. THE Rally_App SHALL allow any participant to share their live location in the Rally_Chat for navigation to the Event location
5. WHEN a User joins an Event, THE Rally_App SHALL display the participant list showing: display name, Reputation_Score, and join time for each participant
6. THE Rally_App SHALL allow a User to leave an Event at any time, freeing up their spot and removing them from the Rally_Chat, with a notification sent to remaining participants
7. IF a User attempts to join an Event that is already full, THEN THE Rally_App SHALL display a "Full" message and optionally allow the User to "Watch" the Event for openings
8. THE Rally_App SHALL prevent a User from joining more than 5 Events simultaneously that have overlapping times

### Requirement 7: Reputation System

**User Story:** As an event organizer, I want to see reliability ratings of people joining my event so I can trust they'll actually show up.

#### Acceptance Criteria

1. THE Rally_App SHALL calculate a Reputation_Score (0-100) for each User based on: events attended / events joined ratio, weighted by recency (last 30 days count double)
2. WHEN an Event's start time passes, THE Rally_App SHALL prompt the Event creator to confirm attendance of each joined participant within 24 hours
3. IF a joined participant is marked as a No_Show (did not attend and did not cancel 1+ hour before), THEN THE Rally_App SHALL deduct 15 points from their Reputation_Score
4. WHEN a User successfully attends an Event (confirmed by creator), THE Rally_App SHALL add 5 points to their Reputation_Score (capped at 100)
5. THE Rally_App SHALL display new users (fewer than 3 events attended) with a "New" badge instead of a numeric Reputation_Score
6. THE Rally_App SHALL display Reputation_Score with a color indicator: green (80-100), yellow (50-79), red (0-49)
7. THE Rally_App SHALL allow Event creators to set a minimum Reputation_Score (0-80) for joining their Event, preventing users below that threshold from joining

### Requirement 8: Notifications

**User Story:** As a user, I want to receive relevant notifications about nearby activities and my joined events so I don't miss anything.

#### Acceptance Criteria

1. WHEN a NOW_Event matching the User's preferred Activity_Types is created within 5km, THE Rally_App SHALL send a push notification within 30 seconds containing: "🏀 [Activity] happening [distance] away in [time]! [X spots left]"
2. WHEN a User has joined an Event, THE Rally_App SHALL send a reminder notification 1 hour before the Event start time
3. WHEN an Event the User has joined is modified or cancelled by the creator, THE Rally_App SHALL send a notification within 30 seconds with the change details
4. WHEN a new participant joins an Event the User created, THE Rally_App SHALL send a notification with the participant's name and Reputation_Score
5. THE Rally_App SHALL allow Users to configure notification preferences: toggle NOW broadcasts on/off, set quiet hours, filter by Activity_Type
6. THE Rally_App SHALL support both in-app notifications and browser push notifications (via service worker)

### Requirement 9: Event History & Stats

**User Story:** As a user, I want to see my past events and activity stats so I can track my social activity and remember who I played with.

#### Acceptance Criteria

1. THE Rally_App SHALL maintain a history of all Events a User has created or joined, accessible from their profile
2. THE Rally_App SHALL display Event history as a chronological list showing: title, Activity_Type, date, location, participant count, and the User's role (creator/participant)
3. THE Rally_App SHALL display aggregate stats on the User's profile: total events attended, events created, most frequent Activity_Type, current month activity count vs previous month
4. THE Rally_App SHALL allow Users to view the participant list of past Events they attended
5. WHEN a User views their Event history, THE Rally_App SHALL allow filtering by Activity_Type and date range

### Requirement 10: PWA & Offline Support

**User Story:** As a user at an outdoor venue with poor connectivity, I want the app to still function for basic operations.

#### Acceptance Criteria

1. THE Rally_App SHALL implement PWA standards including service worker, web app manifest, and pass Lighthouse PWA installability checks
2. WHILE offline, THE Rally_App SHALL display cached Event data from the last online session with a "Last updated X minutes ago" indicator
3. WHILE offline, THE Rally_App SHALL allow the User to compose an Event creation that is queued and submitted when connectivity returns
4. WHEN connectivity is restored, THE Rally_App SHALL sync queued actions within 10 seconds and notify the User
5. THE Rally_App SHALL cache the User's profile, joined Events, and map tile data for offline viewing

### Requirement 11: Responsive Design & Accessibility

**User Story:** As a user, I want to use Rally on any device with a clear, accessible interface.

#### Acceptance Criteria

1. THE Rally_App SHALL render on viewport widths from 320px to 2560px without horizontal scrolling or content overlap
2. THE Rally_App SHALL use a mobile-first design where the map and event creation are the primary interactions on viewports ≤768px
3. THE Rally_App SHALL meet WCAG 2.1 Level AA for color contrast (4.5:1 normal text, 3:1 large text), keyboard navigation, and screen reader compatibility
4. THE Rally_App SHALL render all touch targets at minimum 44x44px with 8px spacing on mobile viewports
5. THE Rally_App SHALL achieve Largest Contentful Paint (LCP) ≤ 3 seconds on a simulated 4G connection
