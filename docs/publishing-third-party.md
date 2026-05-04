# Third-party publishing (SoundCloud, YouTube, Spotify)

This note captures what Sonara can automate today versus what needs distributor workflows or extra OAuth work.

## SoundCloud

- **Upload API:** SoundCloud exposes track creation via `POST https://api.soundcloud.com/tracks` with OAuth user tokens and multipart form fields such as `track[title]` and `track[asset_data]` (audio file). See the [SoundCloud API guide](https://developers.soundcloud.com/docs/api/guide).
- **Sonara:** Studio **Publish** tab can upload when `PUBLISH_PROXY_ENABLED=true` in `.env.local`. The Next.js route `/api/v1/publish/soundcloud` forwards the multipart body to SoundCloud so the browser never needs CORS access to `api.soundcloud.com`.
- **Security:** The beta UI asks for an OAuth access token in the browser. That is convenient for demos only. Production should use Authorization Code + PKCE, store refresh tokens server-side, and never paste secrets into the client.

## YouTube

- **Upload API:** Google **YouTube Data API v3** supports **resumable uploads** for `videos.insert`. Requires a Google Cloud project, OAuth consent, and scope such as `https://www.googleapis.com/auth/youtube.upload`. Private uploads may apply until the API project passes verification. See [Upload a video](https://developers.google.com/youtube/v3/guides/uploading_a_video).
- **Sonara:** `/api/v1/publish/youtube` returns `501` until we implement OAuth token handling and the resumable protocol. Use **Export WAV** from Studio and upload via YouTube Studio as an interim path.

## Spotify

- **Upload:** Spotify does **not** offer a public API for arbitrary third-party uploads directly onto artist profiles the way SoundCloud does. Releases typically flow **aggregator → Spotify**. Spotify for Artists surfaces releases once delivered by the label or distributor.
- **Sonara:** `/api/v1/publish/spotify` returns `501 NOT_SUPPORTED` with that explanation. Export WAV or mastered files for your distributor pipeline.

## Middleware

Routes under `/api/v1/publish/*` are excluded from auth middleware so optional publishing proxies work without a logged-in Sonara session (SoundCloud auth is still required via `Authorization: OAuth …`).
