# AGENTS.md

## Cursor Cloud specific instructions

This is **Sonara** — a browser-based AI music production studio and DJ console. It is a single Next.js 15 application with no backend services, no database, and no external API dependencies. All AI features are mocked with procedural client-side synthesis.

### Running the application

- `npm run dev` starts the Next.js dev server on port 3000.
- Pages: `/` (landing), `/studio` (multitrack production), `/dj` (two-deck DJ console).
- No environment variables or secrets are required.

### Lint / Build / Test

- `npm run lint` — runs ESLint via `next lint`.
- `npm run build` — production build; also validates TypeScript types.
- There is no dedicated test suite (no `test` script in `package.json`). Use `npm run build` as the primary correctness check beyond linting.

### Key caveats

- Audio playback requires a user gesture (click Play/Generate/Load) to unlock the browser's AudioContext — this is a browser security requirement.
- The DJ Console's "Load starter tracks" button seeds the procedural sample library; this takes a moment to render audio buffers on first click.
- The lockfile is `package-lock.json` — always use `npm` (not yarn/pnpm).
