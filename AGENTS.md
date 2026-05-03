# AGENTS.md

## Cursor Cloud specific instructions

Sonara is a **single Next.js 15 app**. Core Studio/DJ audio runs **client-side** (Web Audio + Zustand). **Phase 2** adds optional server persistence and APIs:

- **PostgreSQL + Drizzle** (`DATABASE_URL`) — users/projects/etc.; builds/tests still succeed when unset (`src/db/index.ts` returns `null`).
- **NextAuth.js v5** (`AUTH_SECRET`, `NEXTAUTH_URL`, optional OAuth clients) — see `src/auth.ts`, `/api/auth/*`.
- **Supabase Storage** for `/api/v1/assets/upload` — optional (`SUPABASE_*`); endpoint returns `503` if not configured.

**Operational blueprint:** [`docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md`](docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md).

AI generation/stems/mastering remain **mocked on the client** (`src/lib/ai/mock.ts`) until later phases wire `/api/v1/generate` & workers.

### Running the application

- `npm run dev` — Next.js on port 3000.
- Routes: `/` (landing), `/studio`, `/dj`, `/guest-login` (credentials when auth is enforced).

### Auth middleware / env toggles (`src/middleware.ts`)

- Middleware imports **`NextAuth(authConfig)` from `src/auth.config.ts` only** — Edge-safe (no `bcrypt`, no `postgres`). Full providers + Drizzle live in `src/auth.ts` for Node routes.
- **Production secret:** `AUTH_SECRET` or `NEXTAUTH_SECRET` is required at **runtime** in production. `next build` skips that throw when `NEXT_PHASE` is a compiler phase or `npm_lifecycle_event=build` (see `resolveAuthSecret` in `auth.config.ts`).
- Build may still warn about **jose / CompressionStream** on Edge — known NextAuth + middleware noise unless we swap JWT strategy.

- `NEXT_PUBLIC_REQUIRE_AUTH=true` — middleware protects `/studio`, `/dj`, and `/api/v1/*` (except `/api/v1/auth/*` and `/api/v1/webhooks/*`). Unauthenticated users are redirected to `/guest-login`.
- If **`DATABASE_URL` is unset** and `NEXT_PUBLIC_ALLOW_GUEST_WITHOUT_DB` is not `"false"`, Studio/DJ stay reachable **without** login (CI/local prototype).
- Matcher includes **`/api/v1`** (exact path) plus `/api/v1/:path*` so routes like `/api/v1/projects` are guarded.

### Backend stack (when enabled)

1. **Docker Compose** — repo root `docker-compose.dev.yml` (Postgres 15, Redis 7, MinIO). Matches architecture doc §7:  
   `docker compose -f docker-compose.dev.yml up -d`
2. **Env** — copy `.env.example` → `.env.local` (never commit secrets).
3. **Migrations** — `npm run db:migrate` runs `scripts/migrate.ts` (applies SQL under `drizzle/`).  
   For schema iteration without migration files, `npm run db:push` uses Drizzle Kit push.

### Studio ↔ `/api/v1/projects`

When **signed in** and `NEXT_PUBLIC_REQUIRE_AUTH=true`, Studio loads the latest cloud project on mount and **Save project** POSTs to `/api/v1/projects`. Payload uses `src/lib/studio/projectSync.ts` (base64 WAV per track for round-trip without Supabase URLs — fine for dev; production should prefer storage URLs + asset rows).

### Lint / Build / Test

- `npm run lint`, `npm run type-check`, `npm run build`, `npm run test`, `npm run test:coverage`.

CI (`.github/workflows/ci.yml`): install → lint → type-check → test:coverage → build.

### Key caveats

- **Coverage:** thresholds apply to `src/lib/**/*.ts` only (`vitest.config.ts`).
- **AudioContext:** requires a user gesture (Play / Generate / Load / Save triggers `getAudioContext()` where applicable).
- **Lockfile:** `package-lock.json` — use **npm** only.
- **Multitrack:** call `removeTrack()` on the engine **before** removing from Zustand.
- **BPM:** transport BPM drives `playbackRate` (non–pitch-preserving for now).
