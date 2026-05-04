# Sonara: AI Music Studio & DJ Console

A browser-based AI music production tool with a built-in DJ console. Compose
multitrack arrangements, generate ideas from text prompts, separate stems,
master your tracks, and spin a live two-deck DJ set with AI-planned transitions.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS · Web Audio API · Zustand**.

> **MVP status:** the full UI/UX is wired end-to-end. Audio playback, mixing, EQ,
> filters, pitch, crossfader, multi-track transport, sample library, etc. are all
> real. The **AI features (generation, stems, mastering, auto-mix) are mocked**
> behind clean provider interfaces. See [Swapping in real AI](#swapping-in-real-ai).

## Features

### Production Studio (`/studio`)

- Multi-track timeline with per-track waveforms
- Transport: play / pause / stop / rewind / BPM / master volume
- Per-track: volume, pan, mute, solo, rename, delete
- Upload any audio file or generate from a prompt
- **Genre catalogue** per track (steers mock generation BPM/root presets)
- AI Co-Pilot panel:
  - **Generate** music from a text prompt (genre catalogue plus keyword inference)
  - **Separate stems** (vocals / drums / bass / other) → each becomes a new track
  - **Master** the selected track (loudness target, brightness, punch)
  - **Publish**: export WAV; optional SoundCloud proxy (`PUBLISH_PROXY_ENABLED`); YouTube/Spotify documented constraints

### DJ Console (`/dj`)

- Two-deck mixer with separate waveforms
- Per deck: 3-band EQ (low/mid/high), HP/LP filter sweep, pitch fader (±8%), cue, volume
- Master section: master volume + equal-power crossfader
- Track library with starter tracks (procedurally rendered grooves across genres)
- Drag-import any audio file
- **Auto-Mix panel:**
  - **Plan A→B**: AI suggests beatmatch, key-aware EQ swap, blend duration; auto-adjusts Deck B pitch
  - **Auto-setlist**: orders all library tracks into a credible warm-up arc and loads the first two
  - **Auto-Mix toggle**: when armed, automatically crossfades from Deck A to B near the end of the current track

## Quick start

```bash
npm install
npm run dev
# open http://localhost:3000
```

### Backend auth & Postgres (optional)

For Drizzle + NextAuth + `/api/v1/*`, copy [.env.example](.env.example) to `.env.local`, start Postgres with Docker Compose, run `npm run db:migrate`, then open **`/register`** to create an account (or **`/guest-login`**). Studio **Save project** persists when signed in and `DATABASE_URL` is set (see [AGENTS.md](AGENTS.md)). Use `NEXT_PUBLIC_REQUIRE_AUTH=true` only when you want Studio/DJ gated until login.

## Documentation

- **FE design mockups:** [`docs/design/`](docs/design/) (landing, Studio, DJ, mobile + register reference images).
- **Architecture, deployment & cost (Phase 2 target):** [`docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md`](docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md), companion to PRD v1.0 (CONFIDENTIAL).
- **Publishing:** [`docs/publishing-third-party.md`](docs/publishing-third-party.md) (SoundCloud proxy, YouTube/Spotify constraints).
- **Cursor Cloud agents:** [`AGENTS.md`](AGENTS.md).

## Project structure

```
src/
  app/
    page.tsx            ← landing
    studio/page.tsx     ← Studio
    dj/page.tsx         ← DJ Console
    layout.tsx, globals.css

  components/
    ui/                 ← Waveform, Knob, Fader, Button, Logo
    studio/             ← Transport, TrackLane, AIPanel
    dj/                 ← Deck, Mixer, Library, AutoMixPanel

  lib/
    ai/
      types.ts          ← shared AI types
      providers.ts      ← provider interfaces (the contract)
      mock.ts           ← mock implementations (procedural synthesis)
    audio/
      context.ts        ← shared AudioContext + decode/encode helpers
      deck.ts           ← DJ deck (rate, EQ, filter, gain)
      multitrack.ts     ← Studio multi-track engine
      peaks.ts          ← downsampled peaks for waveforms
      sampleTracks.ts   ← procedural starter library for DJ
    store/
      studioStore.ts    ← Zustand store for Studio
      djStore.ts        ← Zustand store for DJ
    util.ts
```

## Swapping in real AI

All AI surfaces live behind narrow interfaces in `src/lib/ai/providers.ts`:

- `MusicGenerationProvider`
- `StemSeparationProvider`
- `MasteringProvider`
- `TrackAnalysisProvider`
- `AutoMixProvider`

Today they're satisfied by `mockProviders` in `src/lib/ai/mock.ts`. To plug in
real models, write a new implementation that calls your backend (e.g. a Python
service running Demucs / MusicGen / Stable Audio, or hosted endpoints like
Replicate) and export it as the new `mockProviders`. **No UI changes required.**

Example skeleton for a real generation provider:

```ts
import type { MusicGenerationProvider } from "@/lib/ai/providers";

export class ReplicateGen implements MusicGenerationProvider {
  async generate(opts, ctx) {
    const r = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify(opts),
    });
    const ab = await r.arrayBuffer();
    const buffer = await ctx.decodeAudioData(ab);
    return { buffer, prompt: opts.prompt, bpm: 120, durationSec: opts.durationSec };
  }
}
```

## Wrapping as a desktop app

The codebase has no SSR-only dependencies and uses Web Audio API everywhere; wrapping
this in **Tauri** or **Electron** is straightforward when you want native
file-system access and lower-latency audio.

## Notes

- Audio playback requires a user gesture (click "Play", "Generate", or "Load
  starter tracks") to unlock the AudioContext. This is a browser security
  requirement, not a bug.
- The first interaction in the DJ console seeds the procedural sample library.
  This takes a moment to render the audio buffers.
