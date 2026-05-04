# PRD supplement: genres & publishing (May 2026)

Use this addendum alongside your main Sonara PRD (v1.0). It captures scope delivered or scoped in-repo without replacing the full PRD file.

## Genre catalogue

- Each Studio track has a **genre id** from a fixed catalogue (`src/lib/music/genres.ts`).
- **Generation** passes `genreId` into the mock generation provider so BPM/root presets align with the catalogue; prompts still refine feel.
- Genres persist with cloud projects via optional `genreId` on each serialized track (`studioStateToWire`).

## Publishing & export

- **Export:** Users download the selected track as **WAV** from the Studio **Publish** tab (client-side encode).
- **SoundCloud:** Optional server proxy to SoundCloud track upload when `PUBLISH_PROXY_ENABLED=true`. Requires user OAuth token (demo-only pattern until server-side OAuth exists).
- **YouTube:** Documented target (YouTube Data API v3 resumable upload); not implemented in-app yet.
- **Spotify:** No equivalent upload API; documented as distributor / Spotify for Artists ingestion only.

Full technical references: [`docs/publishing-third-party.md`](./publishing-third-party.md).

## Copy / tone

- Product-facing UI strings avoid em dashes (use commas, colons, or parentheses instead).
