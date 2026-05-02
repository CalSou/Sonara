import { describe, it, expect } from "vitest";
import { buildStarterLibrary, specToAnalysis } from "@/lib/audio/sampleTracks";

function mockAudioContext(): AudioContext {
  return {
    // Keep the procedural renderer fast in CI while preserving duration semantics.
    sampleRate: 1000,
    createBuffer: (channels: number, length: number, sampleRate: number) => ({
      length,
      duration: length / sampleRate,
      sampleRate,
      numberOfChannels: channels,
      getChannelData: () => new Float32Array(length),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    }),
  } as unknown as AudioContext;
}

describe("sampleTracks", () => {
  it("buildStarterLibrary returns 6 tracks with buffers and specs", () => {
    const ctx = mockAudioContext();
    const lib = buildStarterLibrary(ctx);
    expect(lib).toHaveLength(6);
    for (const item of lib) {
      expect(item.spec.name).toBeTruthy();
      expect(item.spec.bpm).toBeGreaterThan(0);
      expect(item.buffer.duration).toBeCloseTo(item.spec.durationSec, 0);
      expect(item.buffer.numberOfChannels).toBe(2);
    }
  });

  it("specToAnalysis maps vibe to key and energy", () => {
    const ctx = mockAudioContext();
    const lib = buildStarterLibrary(ctx);
    const house = lib.find((x) => x.spec.vibe === "house");
    expect(house).toBeDefined();
    const analysis = specToAnalysis(house!.spec);
    expect(analysis.bpm).toBe(house!.spec.bpm);
    expect(analysis.keyCamelot).toBe("8A");
    expect(analysis.energy).toBe(0.7);
    expect(analysis.durationSec).toBe(house!.spec.durationSec);
  });
});
