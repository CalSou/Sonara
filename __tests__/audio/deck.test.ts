import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Deck } from "@/lib/audio/deck";

function createMockAudioContext() {
  let time = 0;
  const nodes = {
    biquad: () => ({
      type: "allpass" as BiquadFilterType,
      frequency: { value: 0 },
      gain: { value: 0 },
      Q: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    gain: () => ({
      gain: { value: 1 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    stereopanner: () => ({
      pan: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    bufferSource: () => ({
      buffer: null as AudioBuffer | null,
      playbackRate: { value: 1 },
      onended: null as (() => void) | null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn((when?: number, offset?: number) => {
        void when;
        void offset;
      }),
      stop: vi.fn(),
    }),
  };

  return {
    sampleRate: 48000,
    destination: {},
    get currentTime() {
      return time;
    },
    _setTime(t: number) {
      time = t;
    },
    createBiquadFilter: vi.fn(() => nodes.biquad()),
    createGain: vi.fn(() => nodes.gain()),
    createStereoPanner: vi.fn(() => nodes.stereopanner()),
    createBufferSource: vi.fn(() => nodes.bufferSource()),
  } as unknown as AudioContext & { _setTime: (t: number) => void };
}

function stereoBuffer(durationSec: number, sampleRate = 48000): AudioBuffer {
  const len = Math.floor(durationSec * sampleRate);
  const buf = {
    length: len,
    duration: durationSec,
    sampleRate,
    numberOfChannels: 2,
    getChannelData: (ch: number) => {
      const arr = new Float32Array(len);
      for (let i = 0; i < len; i++) arr[i] = (ch === 0 ? 0.1 : -0.1) * Math.sin(i / 100);
      return arr;
    },
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
  return buf;
}

describe("Deck", () => {
  let ctx: AudioContext & { _setTime: (t: number) => void };
  let deck: Deck;

  beforeEach(() => {
    ctx = createMockAudioContext();
    deck = new Deck(ctx);
  });

  it("has no buffer until load", () => {
    expect(deck.hasBuffer()).toBe(false);
    expect(deck.getDuration()).toBe(0);
    expect(deck.getPosition()).toBe(0);
  });

  it("load sets buffer and resets position", () => {
    const buf = stereoBuffer(5);
    deck.load(buf);
    expect(deck.hasBuffer()).toBe(true);
    expect(deck.getDuration()).toBe(5);
    deck.play();
    ctx._setTime(2);
    deck.pause();
    const posAfterPause = deck.getPosition();
    const buf2 = stereoBuffer(8);
    deck.load(buf2);
    expect(deck.getDuration()).toBe(8);
    expect(deck.getPosition()).not.toBe(posAfterPause);
    expect(deck.isPlaying()).toBe(false);
  });

  it("play, pause, stop control playback", () => {
    deck.load(stereoBuffer(10));
    deck.play();
    expect(deck.isPlaying()).toBe(true);
    ctx._setTime(3);
    deck.pause();
    expect(deck.isPlaying()).toBe(false);
    expect(deck.getPosition()).toBeCloseTo(3, 1);
    deck.play();
    ctx._setTime(5);
    deck.stop();
    expect(deck.isPlaying()).toBe(false);
    expect(deck.getPosition()).toBe(0);
  });

  it("seek clamps to buffer duration", () => {
    deck.load(stereoBuffer(4));
    deck.seek(100);
    expect(deck.getPosition()).toBe(4);
    deck.seek(-5);
    expect(deck.getPosition()).toBe(0);
  });

  it("setRate clamps and updates active source", () => {
    deck.load(stereoBuffer(6));
    deck.setRate(0.4);
    expect(deck.getRate()).toBe(0.5);
    deck.setRate(2);
    expect(deck.getRate()).toBe(1.5);
    deck.play();
    const srcCalls = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.results;
    const lastSrc = srcCalls[srcCalls.length - 1].value as { playbackRate: { value: number } };
    expect(lastSrc.playbackRate.value).toBe(1.5);
  });

  it("setVolume clamps 0..1", () => {
    deck.setVolume(-1);
    expect(deck.getVolume()).toBe(0);
    deck.setVolume(2);
    expect(deck.getVolume()).toBe(1);
  });

  it("setFilter clamps amount", () => {
    deck.setFilter(2);
    deck.setFilter(-2);
    expect(() => deck.setFilter(0)).not.toThrow();
  });

  it("setEq updates filter gains", () => {
    deck.setEq({ low: 3, mid: -2, high: 1 });
    const gainCalls = (ctx.createBiquadFilter as ReturnType<typeof vi.fn>).mock.results;
    const low = gainCalls[0].value as { gain: { value: number } };
    const mid = gainCalls[1].value as { gain: { value: number } };
    const high = gainCalls[2].value as { gain: { value: number } };
    expect(low.gain.value).toBe(3);
    expect(mid.gain.value).toBe(-2);
    expect(high.gain.value).toBe(1);
  });

  it("does not play without buffer", () => {
    deck.play();
    expect(deck.isPlaying()).toBe(false);
  });

  it("onended sets position to end", () => {
    deck.load(stereoBuffer(2));
    deck.play();
    const srcCalls = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.results;
    const src = srcCalls[srcCalls.length - 1].value as {
      onended: (() => void) | null;
    };
    expect(src.onended).toBeTruthy();
    src.onended!();
    expect(deck.isPlaying()).toBe(false);
    expect(deck.getPosition()).toBe(2);
  });
});
