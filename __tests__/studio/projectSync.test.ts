import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  audioBufferToWav,
  studioStateToWire,
  wireToStudioPayload,
} from "@/lib/studio/projectSync";

function createOfflineCtx(sampleRate: number) {
  const frames = 64;
  const buf = {
    sampleRate,
    length: frames,
    duration: frames / sampleRate,
    numberOfChannels: 2,
    getChannelData(ch: number) {
      const data = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        data[i] = Math.sin((i + ch * 0.1) * 0.05);
      }
      return data;
    },
  };
  return buf as unknown as AudioBuffer;
}

describe("projectSync", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("audioBufferToWav", () => {
    it("writes a parseable RIFF WAVE header", () => {
      const ab = createOfflineCtx(48000);
      const wav = audioBufferToWav(ab);
      const u8 = new Uint8Array(wav);
      const head = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
      expect(head).toBe("RIFF");
      const wave = String.fromCharCode(u8[8], u8[9], u8[10], u8[11]);
      expect(wave).toBe("WAVE");
    });
  });

  describe("studioStateToWire / wireToStudioPayload", () => {
    it("round-trips track buffers via base64 WAV", async () => {
      const ctx = {
        sampleRate: 8000,
        decodeAudioData: async (arrayBuffer: ArrayBuffer) => {
          const dv = new DataView(arrayBuffer);
          const riff = String.fromCharCode(
            dv.getUint8(0),
            dv.getUint8(1),
            dv.getUint8(2),
            dv.getUint8(3),
          );
          expect(riff).toBe("RIFF");
          return createOfflineCtx(8000);
        },
      } as unknown as AudioContext;

      const buffer = createOfflineCtx(8000);
      const wire = await studioStateToWire({
        tracks: [
          {
            id: "trk1",
            name: "A",
            color: "#fff",
            buffer,
            peaks: [0.1, 0.2],
            volume: 0.9,
            pan: -0.1,
            mute: false,
            solo: true,
          },
        ],
        selectedId: "trk1",
        isPlaying: false,
        position: 1,
        masterVolume: 0.8,
        bpm: 128,
      });

      expect(wire.version).toBe(1);
      expect(wire.tracks[0].wavBase64).toBeTruthy();

      const payload = await wireToStudioPayload(ctx, wire);
      expect(payload.tracks).toHaveLength(1);
      expect(payload.tracks[0].buffer).not.toBeNull();
      expect(payload.tracks[0].buffer!.sampleRate).toBe(8000);
      expect(payload.tracks[0].name).toBe("A");
      expect(payload.bpm).toBe(128);
    });

    it("preserves empty tracks without wav data", async () => {
      const ctx = {
        sampleRate: 8000,
        decodeAudioData: async () => {
          throw new Error("should not decode");
        },
      } as unknown as AudioContext;

      const wire = await studioStateToWire({
        tracks: [
          {
            id: "t1",
            name: "Empty",
            color: "#000",
            buffer: null,
            peaks: null,
            volume: 1,
            pan: 0,
            mute: false,
            solo: false,
          },
        ],
        selectedId: null,
        isPlaying: false,
        position: 0,
        masterVolume: 1,
        bpm: 120,
      });

      const payload = await wireToStudioPayload(ctx, wire);
      expect(payload.tracks[0].buffer).toBeNull();
    });
  });
});
