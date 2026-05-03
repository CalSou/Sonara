# AGENTS.md

## Cursor Cloud specific instructions

This is **Sonara** — a browser-based AI music production studio and DJ console. It is a single Next.js 15 application with no backend services, no database, and no external API dependencies. All AI features are currently mocked with procedural client-side synthesis behind clean provider interfaces.

**Phase 2 operational target:** infrastructure, CI/CD expansion, env vars, and cost controls are specified in [`docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md`](docs/ARCHITECTURE_DEPLOYMENT_COST_MODEL.md) (companion to PRD v1.0). Implement that doc incrementally; until then the repo remains prototype-only.

### Running the application

- `npm run dev` starts the Next.js dev server on port 3000.
- Pages: `/` (landing), `/studio` (multitrack production), `/dj` (two-deck DJ console).
- No environment variables or secrets are required for the current prototype.

### Lint / Build / Test

- `npm run lint` — runs ESLint via `next lint`.
- `npm run build` — production build; also validates TypeScript types.
- `npm run test` — runs Vitest unit tests (stores, audio engine, utilities).
- `npm run test:watch` — runs Vitest in watch mode.
- `npm run test:coverage` — runs tests with V8 coverage for `src/lib/**/*.ts` (thresholds enforced in `vitest.config.ts`).

CI runs `lint`, `test:coverage`, and `build` on pushes and PRs to `main` (see `.github/workflows/ci.yml`).

### Key caveats

- **Coverage scope:** Automated thresholds apply only to `src/lib/**` (pure logic + audio). React pages and components are not included in the coverage map yet because the current Vitest coverage provider does not remap TS/TSX; add component tests or switch tooling before enforcing app-wide coverage.

- Audio playback requires a user gesture (click Play/Generate/Load) to unlock the browser's AudioContext — this is a browser security requirement.
- The DJ Console's "Load starter tracks" button seeds the procedural sample library; this takes a moment to render audio buffers on first click.
- The lockfile is `package-lock.json` — always use `npm` (not yarn/pnpm).
- The Multitrack engine's `removeTrack()` must be called before removing a track from the Zustand store to avoid orphaned Web Audio nodes.
- Transport BPM is wired to `playbackRate` (non-pitch-preserving interim). Pitch-preserving time-stretch via SoundTouchJS is planned for Phase 4.
