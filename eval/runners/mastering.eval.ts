import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { mockProviders } from "@/lib/ai/mock";
import { createEvalAudioContext, sineMonoBuffer } from "../helpers/audioContext";
import { rmsDb } from "../metrics/audio";

type MasterRow = {
  brightness: number;
  punch: number;
  noteContains: string;
};

function loadMasteringHints(): MasterRow[] {
  const raw = readFileSync(join(process.cwd(), "eval", "datasets", "mastering_targets.jsonl"), "utf8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MasterRow);
}

describe("eval: mastering (mock)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const hints = loadMasteringHints();

  for (const hint of hints) {
    it(`brightness=${hint.brightness} punch=${hint.punch}`, async () => {
      const ctx = createEvalAudioContext(44_100);
      const src = sineMonoBuffer(ctx, 220, 0.5, 0.2);
      const p = mockProviders.mastering.master(src, { brightness: hint.brightness, punch: hint.punch }, ctx);
      await vi.advanceTimersByTimeAsync(5000);
      const result = await p;

      expect(Number.isFinite(result.appliedGainDb)).toBe(true);
      expect(result.notes.join(" ")).toContain(hint.noteContains);
      expect(rmsDb(result.buffer)).toBeGreaterThan(rmsDb(src) - 20);
    });
  }
});
