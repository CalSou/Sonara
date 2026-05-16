# Sonara PRD supplement v1.1 — Publishing (SoundCloud, YouTube, Spotify handoff)

**Status:** Phase 3 engineering target  
**Depends on:** Sonara PRD v1.0, Architecture doc  
**Audience:** Product, engineering, operators

## 1. Problem statement

Producers and DJs need to move finished audio from Sonara to where audiences listen: **SoundCloud** (social audio), **YouTube** (video / mixes), and **streaming DSPs** (Spotify, Apple Music, etc.). Spotify does not offer a public upload API for arbitrary files; delivery is **distributor-mediated**.

## 2. Goals

| ID | Goal |
|----|------|
| G1 | User connects **SoundCloud** once via OAuth; Sonara uploads tracks on their behalf without pasting tokens in the UI. |
| G2 | User connects **Google** once with **youtube.upload** scope; Sonara initiates resumable uploads; browser streams bytes directly to Google (no serverless body limit). |
| G3 | User prepares a **Spotify / DSP release** via captured metadata + **24-bit WAV** delivery file and deep-links to a **consumer distributor**. |
| G4 | Tokens are **encrypted at rest** (AES-256-GCM); connections are revocable. |

## 3. Non-goals

- Direct ingestion to Spotify without a distributor contract.
- FLAC encoding in v1.1 (24-bit WAV is sufficient for distributors).
- Server-side mux of audio+still image to MP4 for YouTube (users mux offline).
- Full project mixdown bounce (multi-track sum); v1.1 uses **selected track buffer** as delivery source.

## 4. User stories

1. **Producer → SoundCloud:** As a signed-in user, I connect SoundCloud, pick my mastered MP3 or use my Sonara track, set title/tags/privacy, and upload.
2. **DJ → YouTube:** As a signed-in user, I connect Google, pick an MP4 mixshow, set metadata, and upload with progress; video starts **private** until I change visibility in YouTube Studio.
3. **Producer → Spotify path:** As a signed-in user, I fill release metadata (artist, ISRC, artwork, genre), export **24-bit WAV**, choose DistroKid/TuneCore/Amuse/CD Baby, and open the distributor site with my file ready.

## 5. Metadata schema (release / distributor handoff)

Captured in `ReleaseMetadata` (Zod-validated JSON in `release_drafts.metadata_json`):

| Field | Required | Notes |
|-------|----------|--------|
| `releaseTitle` | yes | Album/single title |
| `trackTitle` | yes | Track title |
| `primaryArtist` | yes | Display artist |
| `featuredArtists` | no | Array of strings |
| `genreId` | yes | Sonara catalogue id (`src/lib/music/genres.ts`) |
| `language` | yes | BCP-47 e.g. `en` |
| `explicit` | yes | boolean |
| `isrc` | no | If known |
| `upc` | no | If known |
| `releaseDate` | no | ISO date |
| `composerCredits` | no | Text |
| `lyricsNotes` | no | Text |
| `artworkDataUrl` | no | Base64 data URL from browser (stored in JSON for draft only; production should use object storage) |

## 6. Security

- **OAuth:** Authorization Code + PKCE (SoundCloud); Google offline refresh tokens.
- **Storage:** `refresh_token` and `access_token` ciphertext only; key `PUBLISH_TOKEN_KEY` (32-byte AES key, base64), never logged.
- **CSRF:** Random `state` in HttpOnly cookie validated on callback.
- **Session:** Connect/callback/disconnect/upload/init require authenticated Sonara session (`auth()`).
- **Revoke:** Disconnect clears DB row; optional SoundCloud/Google revoke HTTP calls best-effort.

## 7. Cost & quotas

- **YouTube Data API:** Default quota 10,000 units/day; `videos.insert` costs ~1,600 units per upload (verify current Google quota calculator).
- **SoundCloud:** Subject to partner API rate limits; no Sonara infra cost beyond egress.

## 8. Acceptance criteria

See Phase 3 engineering checklist in repository (lint, typecheck, tests, manual OAuth smoke with real apps).

## 9. Operator prerequisites

See [`docs/SECRETS_OPERATOR_GUIDE.md`](./SECRETS_OPERATOR_GUIDE.md): SoundCloud developer app, Google Cloud OAuth consent, `PUBLISH_TOKEN_KEY` generation.
