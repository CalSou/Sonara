import { describe, it, expect } from "vitest";
import { computePeaks } from "@/lib/audio/peaks";

function createMockBuffer(samples: Float32Array): AudioBuffer {
  return {
    length: samples.length,
    duration: samples.length / 44100,
    sampleRate: 44100,
    numberOfChannels: 1,
    getChannelData: () => samples,
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe("computePeaks", () => {
  it("returns an array of the specified bucket count", () => {
    const samples = new Float32Array(4096).fill(0.5);
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 64);
    expect(peaks).toHaveLength(64);
  });

  it("normalizes peaks to 0..1 range", () => {
    const samples = new Float32Array(1024);
    samples[0] = 0.5;
    samples[512] = 1.0;
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 4);
    const max = Math.max(...peaks);
    expect(max).toBe(1);
  });

  it("returns all zeros for a silent buffer", () => {
    const samples = new Float32Array(1024).fill(0);
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 8);
    expect(peaks.every((p) => p === 0)).toBe(true);
  });

  it("detects a spike in the correct bucket", () => {
    const samples = new Float32Array(1000).fill(0);
    samples[750] = 0.9;
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 4);
    expect(peaks[3]).toBe(1); // spike is in the last quarter
    expect(peaks[0]).toBe(0);
  });

  it("handles uniform signal (all peaks equal after normalization)", () => {
    const samples = new Float32Array(2048).fill(0.3);
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 16);
    expect(peaks.every((p) => Math.abs(p - 1) < 0.001)).toBe(true);
  });

  it("uses absolute values (negative samples detected)", () => {
    const samples = new Float32Array(1024).fill(0);
    samples[100] = -0.8;
    const buffer = createMockBuffer(samples);
    const peaks = computePeaks(buffer, 4);
    expect(peaks[0]).toBe(1);
  });
});
