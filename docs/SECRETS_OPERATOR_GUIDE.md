# Secrets & operator guide (Sonara publishing)

This guide is for whoever deploys Sonara and wires third-party publishing.

## 1. `PUBLISH_TOKEN_KEY` (required for publishing)

Encrypts OAuth access/refresh tokens at rest (`AES-256-GCM`, ciphertext prefix `v1.`).

Generate a **32-byte** key and base64-encode it:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set **`PUBLISH_TOKEN_KEY`** to that single-line base64 string in your secrets manager / `.env.local`.

**Rotation:** ciphertext is versioned (`v1.`). Rolling keys requires decrypting old rows with the previous key (follow-up automation).

## 2. SoundCloud developer application

1. Create an app in the SoundCloud developer portal.
2. Enable OAuth redirect URL:  
   `{NEXTAUTH_URL}/api/v1/publish/soundcloud/callback`  
   (or override with `SOUNDCLOUD_REDIRECT_URI`).
3. Set **`SOUNDCLOUD_CLIENT_ID`** and **`SOUNDCLOUD_CLIENT_SECRET`**.
4. Authorization uses **PKCE** (Sonara sets `code_challenge_method=S256`).

Note: partner API access can be gated; keep mock mode documented for staging (`PUBLISH_MOCK_PROVIDERS`).

## 3. Google Cloud / YouTube OAuth client

Create a **separate** OAuth client from NextAuth “Sign in with Google” so scopes stay minimal.

1. Google Cloud Console → APIs & Services → Enable **YouTube Data API v3**.
2. OAuth consent screen → add scope **`…/auth/youtube.upload`**.
3. Create OAuth client (Web). Redirect URI:  
   `{NEXTAUTH_URL}/api/v1/publish/youtube/callback`  
   (or `YOUTUBE_OAUTH_REDIRECT_URI`).
4. Set **`YOUTUBE_OAUTH_CLIENT_ID`** / **`YOUTUBE_OAUTH_CLIENT_SECRET`**.
5. Until verification completes, Google may limit testers (internal/test users).

## 4. Database migrations

Publishing tables: `publish_connections`, `release_drafts` (see `drizzle/0001_publish_connections.sql`).

```bash
npm run db:migrate
```

## 5. Production hardening checklist

- [ ] `PUBLISH_TOKEN_KEY` present and **never** logged.
- [ ] HTTPS everywhere (`Secure` cookies rely on TLS in production).
- [ ] `NEXTAUTH_URL` matches public origin (OAuth redirects).
- [ ] Revoked connections: `disconnect` routes mark `revoked_at`; users can reconnect (partial unique index allows history).

## 6. CI / automated tests

GitHub Actions sets a dummy `PUBLISH_TOKEN_KEY` for crypto unit tests. **Do not** use that value in production.
