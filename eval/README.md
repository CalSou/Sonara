# Sonara eval harness (skeleton)

Offline evaluation for **audio AI surfaces** (generation, stems, mastering) and **publish API contracts**. This folder is intentionally separate from the Next.js app and from the main Vitest suite (`vitest.config.ts` coverage gates).

## Commands

```bash
npm run eval        # run once
npm run eval:watch  # watch mode
```

Uses `eval/vitest.eval.config.ts` (Node environment).

## Layout

| Path | Purpose |
|------|---------|
| `datasets/` | Small JSONL / markdown specs (no large binaries in git) |
| `metrics/` | Audio / tempo / separation helpers (pure TS, expand in V2) |
| `helpers/` | Fake `AudioContext` for deterministic runs |
| `runners/*.eval.ts` | Vitest suites that load datasets and assert metrics |
| `reports/` | Generated JSON summaries (gitignored); keep `.gitkeep` |
| `llm/` | Placeholder for future LangSmith / RAG eval (see `llm/README.md`) |

**Dataset sync:** `datasets/generation_prompts.jsonl` `expectedBpm` values must match `genrePresets` in `src/lib/ai/mock.ts` (update both when presets change).

## V2 roadmap

- Richer **LUFS** (BS.1770-4 style), **SI-SDR** batch thresholds, **spectral** features (FFT).
- **`eval-python/`** for FAD / museval / heavy MIR.
- CI: optional `eval-fast` on PR, `eval-full` on schedule.

## Relationship to `src/lib/ai`

Runners call `mockProviders` from `src/lib/ai/mock.ts` today. When real backends land, swap the provider implementation behind the same interfaces in `src/lib/ai/types.ts` without changing the metric definitions here.
