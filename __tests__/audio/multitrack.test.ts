import { describe, it, expect, beforeEach, vi } from "vitest";
import { Multitrack } from "@/lib/audio/multitrack";

function createMockSourceNode() {
  return {
    buffer: null as AudioBuffer | null,
    playbackRate: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGainNode() {
  return {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockPannerNode() {
  return {
    pan: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function createMockAudioContext() {
  let time = 0;
  return {
    get currentTime() { return time; },
    _advanceTime(s: number) { time += s; },
    destination: {},
    createGain: vi.fn(() => createMockGainNode()),
    createBufferSource: vi.fn(() => createMockSourceNode()),
    createStereoPanner: vi.fn(() => createMockPannerNode()),
  } as unknown as AudioContext & { _advanceTime: (s: number) => void };
}

function createMockBuffer(duration: number): AudioBuffer {
  return {
    length: duration * 44100,
    duration,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(duration * 44100),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

describe("Multitrack", () => {
  let ctx: AudioContext & { _advanceTime: (s: number) => void };
  let engine: Multitrack;

  beforeEach(() => {
    ctx = createMockAudioContext();
    engine = new Multitrack(ctx);
  });

  describe("track management", () => {
    it("setTrackBuffer stores a buffer", () => {
      const buf = createMockBuffer(5);
      engine.setTrackBuffer("trk_1", buf);
      expect(engine.getDuration()).toBe(5);
    });

    it("getDuration returns max buffer duration", () => {
      engine.setTrackBuffer("a", createMockBuffer(3));
      engine.setTrackBuffer("b", createMockBuffer(7));
      expect(engine.getDuration()).toBe(7);
    });

    it("removeTrack clears the buffer and disconnects nodes", () => {
      engine.setTrackBuffer("trk_1", createMockBuffer(5));
      engine.play();
      engine.removeTrack("trk_1");
      expect(engine.getDuration()).toBe(0);
    });
  });

  describe("transport", () => {
    it("starts as not playing", () => {
      expect(engine.isPlaying()).toBe(false);
    });

    it("play sets playing state", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.play();
      expect(engine.isPlaying()).toBe(true);
    });

    it("pause stops playback and preserves position", () => {
      engine.setTrackBuffer("a", createMockBuffer(10));
      engine.play();
      ctx._advanceTime(3);
      engine.pause();
      expect(engine.isPlaying()).toBe(false);
      expect(engine.getPosition()).toBeCloseTo(3, 1);
    });

    it("stop resets position to 0", () => {
      engine.setTrackBuffer("a", createMockBuffer(10));
      engine.play();
      ctx._advanceTime(5);
      engine.stop();
      expect(engine.isPlaying()).toBe(false);
      expect(engine.getPosition()).toBe(0);
    });

    it("seek updates position when not playing", () => {
      engine.setTrackBuffer("a", createMockBuffer(10));
      engine.seek(4);
      expect(engine.getPosition()).toBe(4);
    });

    it("seek clamps to duration", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.seek(100);
      expect(engine.getPosition()).toBe(5);
    });

    it("seek clamps negative to 0", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.seek(-5);
      expect(engine.getPosition()).toBe(0);
    });

    it("getPosition accounts for elapsed time during playback", () => {
      engine.setTrackBuffer("a", createMockBuffer(10));
      engine.play();
      ctx._advanceTime(2.5);
      expect(engine.getPosition()).toBeCloseTo(2.5, 1);
    });
  });

  describe("BPM / playback rate", () => {
    it("defaults to rate 1.0 (120/120)", () => {
      expect(engine.playbackRate).toBe(1);
    });

    it("setTargetBpm changes playback rate", () => {
      engine.setTargetBpm(150);
      expect(engine.playbackRate).toBeCloseTo(150 / 120, 5);
    });

    it("setBaseBpm changes the denominator", () => {
      engine.setBaseBpm(100);
      engine.setTargetBpm(100);
      expect(engine.playbackRate).toBe(1);
    });

    it("playback rate is applied to source nodes on play", () => {
      engine.setTargetBpm(150);
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.play();
      const src = (ctx.createBufferSource as ReturnType<typeof vi.fn>).mock.results.at(-1)!.value;
      expect(src.playbackRate.value).toBeCloseTo(150 / 120, 5);
    });

    it("getPosition accounts for playback rate", () => {
      engine.setTargetBpm(240); // 2x speed
      engine.setTrackBuffer("a", createMockBuffer(10));
      engine.play();
      ctx._advanceTime(2);
      expect(engine.getPosition()).toBeCloseTo(4, 1);
    });
  });

  describe("mixer controls", () => {
    it("setMasterVolume sets output gain", () => {
      engine.setMasterVolume(0.5);
      expect(engine.out.gain.value).toBe(0.5);
    });

    it("setMute during playback restarts with zero gain on muted track", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.setTrackBuffer("b", createMockBuffer(5));
      engine.play();
      engine.setMute("a", true);
      const gains = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results
        .slice(-4)
        .map((r) => r.value.gain.value as number);
      expect(gains.some((g) => g === 0)).toBe(true);
    });

    it("setSolo mutes non-solo tracks when any solo is on", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.setTrackBuffer("b", createMockBuffer(5));
      engine.play();
      engine.setSolo("a", true);
      const gains = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results
        .slice(-4)
        .map((r) => r.value.gain.value as number);
      expect(gains.filter((g) => g === 0).length).toBeGreaterThanOrEqual(1);
    });

    it("setVolume updates gain for active channel", () => {
      engine.setTrackBuffer("a", createMockBuffer(5));
      engine.play();
      engine.setVolume("a", 0.3);
      const gain = (ctx.createGain as ReturnType<typeof vi.fn>).mock.results[1].value;
      expect(gain.gain.value).toBe(0.3);
    });
  });
});
