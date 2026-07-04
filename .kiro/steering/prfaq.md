---
inclusion: manual
---

# PRFAQ: Rally — Set Your Schedule, We Find Your People

## Press Release

**FOR IMMEDIATE RELEASE**

### Rally Launches to Solve the #1 Barrier to Spontaneous Activities: Finding People

*PWA auto-matches nearby people by activity, time, and distance — then creates the event for them*

**Singapore — July 2026** — Today, Rally launches a free Progressive Web App that solves a universal frustration: wanting to play sports or do activities but not having enough people. Unlike existing solutions that require you to post, wait, and hope — Rally does it all automatically.

**The Pain Points Rally Solves:**

1. **"I don't have friends who play this"** — New to a city, new hobby, or friends don't share your interests. You have nobody to play with.
2. **"My friends are always busy"** — Even when you have a group, coordinating schedules is hell. WhatsApp messages get seen but not replied to.
3. **"The places are always so far"** — Even if you find people, the venue is 30 minutes away and nobody wants to travel.

**How Rally Works — Zero Effort Matching:**

1. **Set your availability** — Pick your activity (basketball, badminton, yoga, etc.), set when you're free this week, how far you're willing to travel, and minimum people needed.
2. **We find your people** — Rally automatically matches you with nearby people who want the same activity at overlapping times and are within everyone's travel distance.
3. **Event auto-created** — When enough people match, Rally creates the event, suggests a venue, and invites everyone. No organizer needed.
4. **Just show up** — Accept the invitation, chat with your group to finalize details, and go play.

**The key insight:** You don't need to know anyone. You don't need to be in any group. You don't need to post anything. Just tell Rally what you want to do and when — it handles the rest.

**Also works for active discovery:** Browse nearby events on a live map, explore what's happening by date with a calendar heatmap, or create your own event and let others join.

"We built Rally because finding people to play with shouldn't require being in 10 WhatsApp groups and sending messages that never get replied to. It should be as easy as setting your availability and waiting for a match — like how Uber made getting a ride effortless," said the Rally team.

**Available now** at rally-app.vercel.app. No app store download required.

---

## Frequently Asked Questions

### Customer FAQ

**Q: How is Rally different from Meetup/Playo/Facebook Groups?**
A: Those require someone to organize, post, and hope people show up. Rally requires zero effort — you just set when you're free. The system automatically finds people near you with the same schedule and creates the event. No posting, no waiting, no hoping.

**Q: How is Rally different from WhatsApp/Telegram groups?**
A: Groups require you to ALREADY know people. Rally finds you strangers nearby who share your interest. You don't need existing connections — proximity + schedule overlap is all it takes.

**Q: How does the auto-matching work?**
A: When you set your availability (e.g., "Badminton, Saturday 7-9pm, within 5km, need 4 people"), Rally checks if other users nearby have overlapping availability for the same activity. Once the minimum number of people is reached, it auto-creates a public event, suggests a venue, and invites all matched players.

**Q: What if I want to play RIGHT NOW, not schedule ahead?**
A: You can also create events directly — pick an activity, set the time to today, pin it on the map. Others nearby see it and can join instantly. Events happening soon get a "Starting Soon" tag to create urgency.

**Q: Is it only for sports?**
A: No. Rally supports 35+ activities — sports (basketball, badminton, tennis, volleyball, etc.), fitness (gym, yoga, cycling, rock climbing), social (coffee, karaoke, picnic), creative (music, art, photography), gaming, hackathons, study sessions, and more.

**Q: What if nobody matches me?**
A: Your availability stays active. The moment someone new signs up with overlapping schedule and proximity, the match triggers automatically. You can also browse existing events on the map and join those directly.

**Q: How does Rally suggest a venue?**
A: It looks at where past events for that activity happened nearby and suggests the most popular location. The host can always change it. If no history exists, it shows "TBD - agree in chat" and the group decides together.

**Q: Can I just browse events without setting availability?**
A: Yes! The Explore tab shows all events on a calendar with a heatmap (darker = more events). The Map tab shows them geographically. You can join any public event directly.

**Q: Do I need to pay?**
A: Rally is free. Some events may have a cost (e.g., court rental split among players) — this is shown upfront before you join.

### Internal/Technical FAQ

**Q: Why a PWA?**
A: No app store friction — instant access via URL. Cross-platform with one codebase. Push notifications via service workers. Judges can try it immediately.

**Q: How does the auto-match handle the cold start problem?**
A: (1) Both paths work — passive matching AND active event discovery. Even with few users, you can browse/create events manually. (2) Launch at density — one university campus first. (3) The more people set availability, the more matches trigger — creates a virtuous cycle.

**Q: What's the tech stack?**
A: Next.js 15 (App Router), Supabase (Postgres + PostGIS + Realtime + Auth), Leaflet (maps), shadcn/ui, deployed on Vercel. PostGIS enables sub-millisecond proximity queries with spatial indexes.

**Q: How does location work?**
A: Browser geolocation saved to user profile. Used for: (1) calculating distance to events, (2) auto-matching users within each other's travel radius, (3) centering the map. Exact location never shown to other users.

**Q: Why not just use a group chat app?**
A: Group chats solve coordination for EXISTING groups. Rally solves discovery — finding people you don't already know. It creates the group for you based on shared interest + proximity + time overlap.
