import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { mockProviders } from "@/lib/ai/mock";
import { createEvalAudioContext } from "../helpers/audioContext";
import { rmsDb } from "../metrics/audio";

type GenerationRow = {
  prompt: string;
  genreId: string;
  expectedBpm: number;
  durationSec: number;
};

function loadGenerationDataset(): GenerationRow[] {
  const raw = readFileSync(join(process.cwd(), "eval", "datasets", "generation_prompts.jsonl"), "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GenerationRow);
}

describe("eval: generation (mock provider)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const rows = loadGenerationDataset();

  for (const row of rows) {
    it(`genre ${row.genreId} bpm ${row.expectedBpm}`, async () => {
      const ctx = createEvalAudioContext(44_100);
      const p = mockProviders.generation.generate(
        {
          prompt: row.prompt,
          durationSec: row.durationSec,
          genreId: row.genreId,
        },
        ctx,
      );
      await vi.advanceTimersByTimeAsync(5000);
      const result = await p;

      expect(result.bpm).toBe(row.expectedBpm);
      expect(result.durationSec).toBe(row.durationSec);
      expect(result.buffer.duration).toBeCloseTo(row.durationSec, 2);
      expect(rmsDb(result.buffer)).toBeGreaterThan(-80);
    });
  }
});
