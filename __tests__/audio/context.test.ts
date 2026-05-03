import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { audioBufferToWavBlob } from "@/lib/audio/context";

describe("audioBufferToWavBlob", () => {
  it("returns a WAV blob with correct header and size", () => {
    const sampleRate = 44100;
    const len = 100;
    const buf = {
      length: len,
      duration: len / sampleRate,
      sampleRate,
      numberOfChannels: 1,
      getChannelData: () => {
        const d = new Float32Array(len);
        d.fill(0.25);
        return d;
      },
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;

    const blob = audioBufferToWavBlob(buf);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBeGreaterThan(44);

    return blob.arrayBuffer().then((ab) => {
      const view = new DataView(ab);
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe("RIFF");
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe("WAVE");
    });
  });

  it("handles stereo buffers", () => {
    const sampleRate = 48000;
    const len = 50;
    const ch0 = new Float32Array(len).fill(0.1);
    const ch1 = new Float32Array(len).fill(-0.1);
    const buf = {
      length: len,
      duration: len / sampleRate,
      sampleRate,
      numberOfChannels: 2,
      getChannelData: (c: number) => (c === 0 ? ch0 : ch1),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;

    const blob = audioBufferToWavBlob(buf);
    expect(blob.size).toBe(44 + len * 2 * 2);
  });
});

describe("getAudioContext / decodeFileToBuffer", () => {
  const originalWindow = globalThis.window;
  const originalAudioCtx = (globalThis as Record<string, unknown>).AudioContext;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: typeof originalWindow }).window = originalWindow;
    }
    if (originalAudioCtx !== undefined) {
      (globalThis as { AudioContext: unknown }).AudioContext = originalAudioCtx;
    } else {
      delete (globalThis as { AudioContext?: unknown }).AudioContext;
    }
  });

  async function loadContextModule() {
    return import("@/lib/audio/context");
  }

  it("getAudioContext throws when window is undefined (SSR)", async () => {
    delete (globalThis as { window?: unknown }).window;
    const { getAudioContext } = await loadContextModule();
    expect(() => getAudioContext()).toThrow(/only available in the browser/);
  });

  it("getAudioContext creates shared context and resumes if suspended", async () => {
    const resume = vi.fn().mockResolvedValue(undefined);
    class MockCtx {
      state = "suspended";
      resume = resume;
    }
    (globalThis as unknown as { window: Window & { AudioContext?: typeof MockCtx } }).window =
      {
        AudioContext: MockCtx,
      } as unknown as Window;
    (globalThis as unknown as { AudioContext?: typeof MockCtx }).AudioContext = MockCtx;

    const { getAudioContext } = await loadContextModule();
    const ctx = getAudioContext();
    expect(ctx).toBeInstanceOf(MockCtx);
    expect(resume).toHaveBeenCalled();
    const ctx2 = getAudioContext();
    expect(ctx2).toBe(ctx);
  });

  it("decodeFileToBuffer decodes via AudioContext", async () => {
    const decoded = {
      length: 10,
      duration: 10 / 44100,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(10),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    } as unknown as AudioBuffer;

    const decodeAudioData = vi.fn().mockResolvedValue(decoded);
    class MockCtx {
      state = "running";
      resume = vi.fn();
      decodeAudioData = decodeAudioData;
    }
    (globalThis as unknown as { window: Window & { AudioContext?: typeof MockCtx } }).window =
      {
        AudioContext: MockCtx,
      } as unknown as Window;
    (globalThis as unknown as { AudioContext?: typeof MockCtx }).AudioContext = MockCtx;

    const { getAudioContext, decodeFileToBuffer } = await loadContextModule();
    getAudioContext();
    const file = new File([new Uint8Array([1, 2, 3])], "test.wav", { type: "audio/wav" });
    const out = await decodeFileToBuffer(file);
    expect(decodeAudioData).toHaveBeenCalled();
    expect(out).toBe(decoded);
  });
});
