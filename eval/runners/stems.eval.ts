import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { mockProviders } from "@/lib/ai/mock";
import { createEvalAudioContext, sineMonoBuffer } from "../helpers/audioContext";
import { rmsDb } from "../metrics/audio";
import { siSdr } from "../metrics/separation";

describe("eval: stems (mock separator)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces four playable stems with measurable separation", async () => {
    const ctx = createEvalAudioContext(22_050);
    const src = sineMonoBuffer(ctx, 440, 0.25, 0.35);
    const p = mockProviders.stems.separate(src, ctx);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;

    const kinds = Object.keys(result.stems).sort();
    expect(kinds).toEqual(["bass", "drums", "other", "vocals"]);

    const rmsList = kinds.map((k) => rmsDb(result.stems[k as keyof typeof result.stems]));
    for (const db of rmsList) {
      expect(db).toBeGreaterThan(-120);
    }

    const v = result.stems.vocals.getChannelData(0);
    const d = result.stems.drums.getChannelData(0);
    const score = siSdr(v, d);
    expect(Number.isFinite(score)).toBe(true);
    expect(Math.abs(rmsDb(result.stems.vocals) - rmsDb(result.stems.drums))).toBeGreaterThan(0.01);
  });
});
