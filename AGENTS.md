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
- Routes: `/` (landing), `/studio`, `/dj`, `/guest-login`, `/register`.

### Auth middleware / env toggles (`src/middleware.ts`)

- Middleware imports **`NextAuth(authConfig)` from `src/auth.config.ts` only** — Edge-safe (no `bcrypt`, no `postgres`). Full providers + Drizzle live in `src/auth.ts` for Node routes.
- **Production secret:** `AUTH_SECRET` or `NEXTAUTH_SECRET` is required at **runtime** in production. `next build` skips that throw when `NEXT_PHASE` is a compiler phase or `npm_lifecycle_event=build` (see `resolveAuthSecret` in `auth.config.ts`).
- Build may still warn about **jose / CompressionStream** on Edge — known NextAuth + middleware noise unless we swap JWT strategy.

- `NEXT_PUBLIC_REQUIRE_AUTH=true` — middleware protects `/studio`, `/dj`, and `/api/v1/*` (except `/api/v1/auth/*`, `/api/v1/webhooks/*`, and `/api/v1/publish/*`). Unauthenticated users are redirected to `/guest-login`.
- If **`DATABASE_URL` is unset** and `NEXT_PUBLIC_ALLOW_GUEST_WITHOUT_DB` is not `"false"`, Studio/DJ stay reachable **without** login (CI/local prototype).
- Matcher includes **`/api/v1`** (exact path) plus `/api/v1/:path*` so routes like `/api/v1/projects` are guarded.

### Backend stack (when enabled)

1. **Docker Compose** — repo root `docker-compose.dev.yml` (Postgres 15, Redis 7, MinIO). Matches architecture doc §7:  
   `docker compose -f docker-compose.dev.yml up -d`
2. **Env** — copy `.env.example` → `.env.local` (never commit secrets).
3. **Migrations** — `npm run db:migrate` runs `scripts/migrate.ts` (applies SQL under `drizzle/`).  
   For schema iteration without migration files, `npm run db:push` uses Drizzle Kit push.

### Studio ↔ `/api/v1/projects`

When **signed in** (credentials or OAuth), Studio **GET**s `/api/v1/projects` once per session to load the latest saved project and **Save project** **POST**s to the same route. This works **without** `NEXT_PUBLIC_REQUIRE_AUTH=true` as long as the server has **`DATABASE_URL`** set and migrations applied (`npm run db:migrate`). If the DB is not configured, the API returns **503** and the Studio activity log explains next steps.

**Strict gate:** Set `NEXT_PUBLIC_REQUIRE_AUTH=true` to force login before `/studio` / `/dj` / protected APIs.

Payload uses `src/lib/studio/projectSync.ts` (base64 WAV per track for dev round-trip; production should move to storage URLs + `audio_assets`).

### Publish tab (Phase 3)

Studio **Publish** uses **server-side OAuth** (tokens encrypted with **`PUBLISH_TOKEN_KEY`**) instead of pasted secrets:

- **SoundCloud:** `GET .../publish/soundcloud/connect` → callback → `POST .../soundcloud/upload`
- **YouTube:** `GET .../publish/youtube/connect` → callback → `POST .../youtube/upload/init` then browser **chunked PUT** to Google’s `uploadUrl`, optional `POST .../finalize`
- **Spotify path:** `POST .../publish/spotify/handoff` saves release metadata + distributor deep link; **24-bit WAV** export is client-side (`audioBufferToWav24`). Legacy **`POST /api/v1/publish/spotify`** remains **501**.

Connection summary: **`GET /api/v1/publish/connections`**. Middleware still excludes **`/api/v1/publish/*`** from Edge auth matching; routes gate with **`auth()`**.

See **`docs/publishing-third-party.md`** and **`docs/SECRETS_OPERATOR_GUIDE.md`**.

### Lint / Build / Test

- `npm run lint`, `npm run type-check`, `npm run build`, `npm run test`, `npm run test:coverage`.

CI (`.github/workflows/ci.yml`): install → lint → type-check → test:coverage → build.

### Next.js cache issues (`ENOENT … vendor-chunks/lucide-react.js`)

If the server expects `.next/server/vendor-chunks/*.js` that no longer exists, the `.next` output is **stale or corrupted** (common after interrupted builds or concurrent dev/start).

1. Stop `next dev` / `next start`.
2. Run **`npm run clean`** (deletes `.next`) — `npm run build` runs **`prebuild`** and wipes `.next` automatically before each production build.
3. Restart **`npm run dev`** or **`npm run build && npm run start`**.

`next.config.mjs` enables `experimental.optimizePackageImports: ["lucide-react"]` to align lucide bundling with current Next recommendations.

### Key caveats

- **Coverage:** thresholds apply to `src/lib/**/*.ts` only (`vitest.config.ts`).
- **AudioContext:** requires a user gesture (Play / Generate / Load / Save triggers `getAudioContext()` where applicable).
- **Lockfile:** `package-lock.json` — use **npm** only.
- **Multitrack:** call `removeTrack()` on the engine **before** removing from Zustand.
- **BPM:** transport BPM drives `playbackRate` (non–pitch-preserving for now).
