# FleetMind AI

One scan. Complete fleet intelligence. FleetMind turns daily handwritten collection sheets into reviewed financial records, dashboard metrics, and plain-language business answers.

## Run locally

1. Copy `.env.example` to `.env.local` and `backend/.env.example` to `backend/.env`.
2. Install frontend dependencies with `npm install`, then run `npm run dev`.
3. In another terminal, create a virtual environment, install `backend/requirements.txt`, then run `uvicorn app.main:app --reload --app-dir backend`.
4. Open `http://localhost:3000`. The app includes a fully working local demo data fallback; add Supabase and OpenAI credentials to enable persistence and vision extraction.

## Deploy

Deploy the backend first, then the frontend.

### Backend on Render

1. Create a new Render Blueprint from this GitHub repository.
2. Render will use `render.yaml` and start the FastAPI service from `backend/`.
3. Set environment variables in Render:
   - `FRONTEND_ORIGIN`: your deployed frontend URL, for example `https://your-app.vercel.app`
   - `OPENAI_API_KEY`: optional, required only for vision extraction/chat AI
   - `OPENAI_MODEL`: optional, defaults to `gpt-5.6-sol`
4. After deploy, copy the backend URL. The API base will be:
   - `https://your-render-service.onrender.com/api`

### Frontend on Vercel

1. Import this GitHub repository into Vercel.
2. Set the environment variable:
   - `NEXT_PUBLIC_API_URL`: your Render API URL ending in `/api`
3. Deploy the frontend.

If the frontend URL changes later, update `FRONTEND_ORIGIN` in Render so the API allows browser requests from the deployed app.

## Database

Apply `supabase/migrations/001_fleetmind.sql` in the Supabase SQL editor. It creates the schema and deterministic demo data.
