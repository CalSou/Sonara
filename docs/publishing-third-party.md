# Third-party publishing (SoundCloud, YouTube, Spotify)

What Sonara ships as **MVP** versus platform limits.

## Universal files (Studio Publish tab)

- **Studio track:** rendered to **WAV** for export and for SoundCloud when that source is selected (internally lossless PCM).
- **File from computer:** Sonara forwards your **original bytes** (MP3, WAV, FLAC, AAC, OGG, AIFF, etc.). What actually uploads depends on the platform (SoundCloud accepts many audio formats per their docs).
- **Large files:** serverless hosts often cap request body size (for example a few MB). Big mixes may require **self-hosted Node** or chunked flows in a later iteration.

## SoundCloud

- **API:** `POST https://api.soundcloud.com/tracks` with OAuth user token and multipart fields such as `track[title]` and `track[asset_data]`. See the [SoundCloud API guide](https://developers.soundcloud.com/docs/api/guide).
- **Sonara:** `/api/v1/publish/soundcloud` proxies the browser multipart body when **`PUBLISH_PROXY_ENABLED=true`**.
- **Security:** Demo UI can paste an OAuth token; production should use Authorization Code + PKCE and **never** expose refresh tokens to the client.

## YouTube

- **API:** [YouTube Data API v3](https://developers.google.com/youtube/v3/guides/uploading_a_video) **resumable upload** for `videos.insert`. Needs Google Cloud project, OAuth consent, and scope such as `https://www.googleapis.com/auth/youtube.upload`.
- **MVP constraint:** `videos.insert` expects a **video container** (for example **MP4**), not a bare WAV/MP3. Producers should mux audio + still image or video in an editor, pick **File from computer** with that MP4/MOV/WebM, then upload.
- **Sonara:** `/api/v1/publish/youtube` performs initiate + PUT when **`YOUTUBE_PUBLISH_PROXY_ENABLED=true`**. Send `Authorization: Bearer <access_token>` and multipart fields `file`, `title`, optional `description`. New uploads default to **privacyStatus: private**; change visibility in YouTube Studio.

## Spotify

- **Upload:** Spotify does **not** expose a public API for arbitrary third-party audio uploads straight onto artist profiles like SoundCloud. Releases flow **aggregator/distributor → Spotify**; Spotify for Artists is for releases already delivered.
- **Sonara:** `/api/v1/publish/spotify` returns **501** with that explanation. Export mastered audio for your distributor workflow.

## Middleware

`/api/v1/publish/*` is excluded from Sonara session middleware so proxies work without logging into Sonara (each platform still requires its own OAuth token).
