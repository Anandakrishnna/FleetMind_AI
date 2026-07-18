# FleetMind AI architecture

The app uses a deliberately resilient split architecture for a live demo:

- `app/` holds the Next.js App Router experience and page-level composition.
- `components/` contains reusable visual and workflow components.
- `lib/` holds typed contracts, formatting, API client, and demo fallbacks.
- `backend/app/` exposes FastAPI routes. It uses Supabase when configured and a seeded in-memory repository otherwise.
- `supabase/migrations/` is the source of truth for PostgreSQL schema, RLS policies, indexes, and demo seed data.

The scanner sends an image to FastAPI. FastAPI uses the OpenAI Responses API when configured, validates the returned JSON, and otherwise returns a realistic editable demo extraction. Chat answers use an explicit financial-query fallback whenever AI is unavailable.
