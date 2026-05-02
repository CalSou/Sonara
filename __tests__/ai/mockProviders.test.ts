import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockProviders } from "@/lib/ai/mock";
import type { TrackAnalysis } from "@/lib/ai/types";

function mockAudioContext(): AudioContext {
  return {
    sampleRate: 44100,
    createBuffer: (ch: number, len: number, sr: number) => {
      const channelData: Float32Array[] = [];
      for (let c = 0; c < ch; c++) {
        const data = new Float32Array(len);
        for (let i = 0; i < len; i++) {
          data[i] = 0.2 * Math.sin((2 * Math.PI * (440 + c * 50) * i) / sr);
        }
        channelData.push(data);
      }
      const buf = {
        length: len,
        duration: len / sr,
        sampleRate: sr,
        numberOfChannels: ch,
        getChannelData: (c: number) => channelData[c]!,
        copyFromChannel: () => {},
        copyToChannel: () => {},
      } as unknown as AudioBuffer;
      return buf;
    },
  } as unknown as AudioContext;
}

function sineBuffer(ctx: AudioContext, seconds = 0.5): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const ch0 = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch0[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / sr);
  return buf;
}

describe("mockProviders", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("generation returns buffer with metadata", async () => {
    const ctx = mockAudioContext();
    const p = mockProviders.generation.generate(
      { prompt: "house music loop", durationSec: 1 },
      ctx,
    );
    await vi.advanceTimersByTimeAsync(2000);
    const result = await p;
    expect(result.buffer).toBeDefined();
    expect(result.buffer.duration).toBeGreaterThan(0);
    expect(result.prompt).toBe("house music loop");
    expect(result.bpm).toBeGreaterThan(0);
    expect(result.durationSec).toBe(1);
  });

  it("stems separate returns four distinct stems", async () => {
    const ctx = mockAudioContext();
    const src = sineBuffer(ctx);
    const p = mockProviders.stems.separate(src, ctx);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await p;
    expect(Object.keys(result.stems).sort()).toEqual(["bass", "drums", "other", "vocals"]);
    expect(result.stems.vocals.duration).toBe(src.duration);
    const stemKeys = ["vocals", "drums", "bass", "other"] as const;
    let maxDiff = 0;
    for (let s = 0; s < stemKeys.length; s++) {
      for (let t = s + 1; t < stemKeys.length; t++) {
        const a = result.stems[stemKeys[s]].getChannelData(0);
        const b = result.stems[stemKeys[t]].getChannelData(0);
        for (let i = 0; i < Math.min(a.length, 500); i++) {
          maxDiff = Math.max(maxDiff, Math.abs(a[i] - b[i]));
        }
      }
    }
    expect(maxDiff).toBeGreaterThan(0.0001);
  });

  it("mastering produces output and notes", async () => {
    const ctx = mockAudioContext();
    const src = sineBuffer(ctx);
    const p = mockProviders.mastering.master(src, { loudnessLufs: -14, brightness: 0.2, punch: 0.6 }, ctx);
    await vi.advanceTimersByTimeAsync(2000);
    const result = await p;
    expect(result.buffer.length).toBe(src.length);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(Number.isFinite(result.appliedGainDb)).toBe(true);
  });

  it("analysis returns track metadata", async () => {
    const buf = mockAudioContext().createBuffer(1, 44100, 44100);
    const p = mockProviders.analysis.analyze(buf);
    await vi.advanceTimersByTimeAsync(500);
    const result = await p;
    expect(result.bpm).toBeGreaterThanOrEqual(60);
    expect(result.durationSec).toBeCloseTo(1, 1);
    expect(result.keyCamelot).toMatch(/\d+[AB]/);
  });

  it("autoMix planTransition returns valid plan", async () => {
    const a: TrackAnalysis = {
      bpm: 120,
      keyCamelot: "8A",
      keyMusical: "Am",
      energy: 0.5,
      durationSec: 180,
    };
    const b: TrackAnalysis = { ...a, bpm: 128, keyCamelot: "10B" };
    const p = mockProviders.autoMix.planTransition(
      { id: "t1", analysis: a },
      { id: "t2", analysis: b },
    );
    await vi.advanceTimersByTimeAsync(500);
    const plan = await p;
    expect(plan.fromTrackId).toBe("t1");
    expect(plan.toTrackId).toBe("t2");
    expect(plan.crossfadeDurationSec).toBeGreaterThan(0);
    expect(plan.notes.length).toBeGreaterThan(0);
  });

  it("buildSetlist orders and builds transitions", async () => {
    const tracks = [
      { id: "a", analysis: { bpm: 100, keyCamelot: "1A", keyMusical: "Am", energy: 0.9, durationSec: 60 } },
      { id: "b", analysis: { bpm: 110, keyCamelot: "2A", keyMusical: "Em", energy: 0.3, durationSec: 60 } },
      { id: "c", analysis: { bpm: 105, keyCamelot: "3A", keyMusical: "Bm", energy: 0.5, durationSec: 60 } },
    ];
    const p = mockProviders.autoMix.buildSetlist(tracks);
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;
    expect(result.orderedTrackIds).toHaveLength(3);
    expect(result.transitions).toHaveLength(2);
  });
});
