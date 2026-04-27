# Wanderlog – Architecture Context

## Overview
Wanderlog is a Next.js 14 (App Router) travel planning and journaling app for solo travelers. Users authenticate via Supabase, create trips, build day-by-day itineraries, and write journal entries.

---

## Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, React Server Components) |
| Auth + DB | Supabase (PostgreSQL, RLS, GoTrue auth) |
| Styling | Tailwind CSS v3 with custom brand tokens |
| Language | TypeScript (strict) |

---

## Project Structure
```
src/
├── app/
│   ├── layout.tsx              # Root layout – renders Nav, passes user from server
│   ├── page.tsx                # Redirects / → /trips
│   ├── globals.css             # Tailwind base + custom component classes
│   ├── auth/
│   │   └── callback/route.ts   # OAuth / magic-link exchange → redirect to /trips
│   ├── login/
│   │   └── page.tsx            # Magic-link + Google OAuth login form (client)
│   └── trips/
│       ├── page.tsx            # Trip list – server component, fetches all trips
│       ├── new/
│       │   └── page.tsx        # Create trip form (client)
│       └── [id]/
│           └── page.tsx        # Trip detail – itinerary + journal (server)
├── components/
│   ├── Nav.tsx                 # Sticky header with logo, "+ New Trip" CTA, user avatar
│   └── TripCard.tsx            # Reusable card: cover photo, destination, status badge
├── lib/
│   └── supabase/
│       ├── client.ts           # Browser Supabase client (createBrowserClient)
│       └── server.ts           # Server Supabase client (createServerClient + cookies)
├── middleware.ts               # Route protection: unauthenticated → /login; authed + /login → /trips
└── types/
    └── database.ts             # Full Database interface + convenience row types
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Tables, RLS policies, updated_at triggers
```

---

## Database Schema

### `trips`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | auto |
| user_id | uuid FK → auth.users | cascade delete |
| title | text | required |
| destination | text | required |
| start_date | date | nullable |
| end_date | date | nullable |
| cover_photo_url | text | nullable |
| status | text | `planning \| ongoing \| completed \| cancelled` |
| created_at / updated_at | timestamptz | auto |

### `itinerary_days`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| trip_id | uuid FK → trips | cascade delete |
| day_number | integer | unique per trip |
| date | date | nullable |

### `activities`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| day_id | uuid FK → itinerary_days | cascade delete |
| time | time | nullable |
| title | text | required |
| notes | text | nullable |
| place_name | text | nullable |
| lat / lng | numeric(9,6) | nullable |
| order_index | integer | for manual ordering |

### `journal_entries`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| trip_id | uuid FK → trips | cascade delete |
| day_number | integer | nullable |
| content | text | |
| photos | text[] | array of URLs |
| mood | text | `amazing \| good \| okay \| tough \| terrible` |
| created_at / updated_at | timestamptz | auto |

---

## Auth Flow
1. User visits `/login` → email magic-link or Google OAuth button.
2. Supabase redirects to `/auth/callback?code=…` after consent.
3. Route handler exchanges the code for a session and redirects to `/trips`.
4. `middleware.ts` runs on every request: unauthenticated requests to protected routes redirect to `/login`; authenticated users hitting `/login` redirect to `/trips`.
5. Server components call `createClient()` from `src/lib/supabase/server.ts` (cookie-based session). Client components call `createClient()` from `src/lib/supabase/client.ts` (browser session).

---

## Row Level Security
All four tables have RLS enabled. Every policy gates access by checking that `auth.uid()` matches the `user_id` on the parent `trips` row (directly or via join). This means each user can only ever read or write their own data.

---

## Environment Variables
Copy `.env.local.example` → `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Getting Started
```bash
npm install
# configure .env.local
# run 001_initial_schema.sql in the Supabase SQL editor
npm run dev
```
Open http://localhost:3000 — you'll be redirected to `/login`.

---

## Key Design Decisions
- **Server Components by default**: pages that only read data are server components, keeping secrets and DB calls off the client.
- **Client components only where needed**: `Nav` (sign-out), `/login`, `/trips/new` are `"use client"` because they need interactivity or browser-only APIs (`location.origin`).
- **No ORM**: raw Supabase JS client keeps the data layer simple and type-safe via the generated `Database` interface.
- **RLS as the security boundary**: all access control lives in the database, not application code, so it's enforced even if a bug bypasses app-level checks.
