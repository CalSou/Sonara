# Third-party publishing (SoundCloud, YouTube, Spotify path)

Sonara **Phase 3** implements **server-side OAuth** for SoundCloud and Google YouTube upload scope, **encrypted token storage**, and a **distributor handoff** flow for Spotify/DSP delivery (no direct Spotify upload API).

## Operator checklist

1. Configure secrets per [`docs/SECRETS_OPERATOR_GUIDE.md`](./SECRETS_OPERATOR_GUIDE.md).
2. Apply DB migrations (`npm run db:migrate`) so `publish_connections` and `release_drafts` exist.
3. Register redirect URIs exactly as deployed (`NEXTAUTH_URL` + `/api/v1/publish/.../callback`).

## SoundCloud

- **Flow:** Authorization Code + **PKCE** against `https://secure.soundcloud.com/authorize` → token exchange → encrypted refresh/access tokens in Postgres.
- **Routes:**  
  - `GET /api/v1/publish/soundcloud/connect`  
  - `GET /api/v1/publish/soundcloud/callback`  
  - `POST /api/v1/publish/soundcloud/disconnect`  
  - `POST /api/v1/publish/soundcloud/upload` (multipart `file`, `title`, optional `description`, `tag_list`, `sharing`)
- **Upload:** Server calls `https://api.soundcloud.com/tracks` with `Authorization: OAuth <access_token>` using a **fresh** token (`withFreshAccessToken`).
- **Quotas:** Subject to SoundCloud partner API limits.

## YouTube (Google)

- **Scopes:** `https://www.googleapis.com/auth/youtube.upload` only on the **YouTube OAuth client** (`YOUTUBE_OAUTH_*`), separate from NextAuth Google sign-in.
- **Offline refresh:** `access_type=offline` + `prompt=consent` on `/connect` so refresh tokens are issued reliably during MVP testing.
- **Routes:**  
  - `GET /api/v1/publish/youtube/connect`  
  - `GET /api/v1/publish/youtube/callback`  
  - `POST /api/v1/publish/youtube/disconnect`  
  - `POST /api/v1/publish/youtube/upload/init` → returns Google **`uploadUrl`**  
  - Browser **PUT** chunks directly to Google (resumable).  
  - `POST /api/v1/publish/youtube/upload/finalize` (optional echo of resource JSON)
- **Quota:** YouTube Data API default ~10k units/day; each upload consumes meaningful quota (check Google Cloud console).

## Spotify / DSP

- Spotify does **not** expose a public upload API for arbitrary files to artist catalogs.
- **`POST /api/v1/publish/spotify`** remains **501** with explanation.
- **`POST /api/v1/publish/spotify/handoff`** saves `release_drafts` metadata JSON and returns a **distributor signup URL** (DistroKid, TuneCore, Amuse, CD Baby). Users export **24-bit WAV** from Studio.

## Connection status

- `GET /api/v1/publish/connections` → `{ connections: { soundcloud?, youtube? } }` (no secrets).

## Middleware

- `/api/v1/publish/*` is excluded from strict middleware auth, but **each route** still calls `auth()` and returns **401** when unauthenticated for mutating operations.

## Mock mode

- `PUBLISH_MOCK_PROVIDERS=true` makes `withFreshAccessToken` skip DB/token refresh (for constrained CI/dev). Not for production.
