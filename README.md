# FleetMind AI

One scan. Complete fleet intelligence. FleetMind turns daily handwritten collection sheets into reviewed financial records, dashboard metrics, and plain-language business answers.

## Run locally

1. Copy `.env.example` to `.env.local` and `backend/.env.example` to `backend/.env`.
2. Install frontend dependencies with `npm install`, then run `npm run dev`.
3. In another terminal, create a virtual environment, install `backend/requirements.txt`, then run `uvicorn app.main:app --reload --app-dir backend`.
4. Open `http://localhost:3000`. The app includes a fully working local demo data fallback; add Supabase and OpenAI credentials to enable persistence and vision extraction.

## Database

Apply `supabase/migrations/001_fleetmind.sql` in the Supabase SQL editor. It creates the schema and deterministic demo data.
