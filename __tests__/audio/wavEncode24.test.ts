import { describe, expect, it } from "vitest";

import { audioBufferToWav24 } from "@/lib/audio/wavEncode24";

function fakeStereoBuffer(): AudioBuffer {
  const sampleRate = 48000;
  const length = 4;
  const nCh = 2;
  const buf = {
    sampleRate,
    length,
    numberOfChannels: nCh,
    duration: length / sampleRate,
    getChannelData(ch: number) {
      const f = new Float32Array(length);
      if (ch === 0) {
        f.set([1, 0.5, -0.5, -1]);
      } else {
        f.set([0.25, -0.25, 0, 0.75]);
      }
      return f;
    },
  } as unknown as AudioBuffer;
  return buf;
}

describe("audioBufferToWav24", () => {
  it("writes RIFF header and readable PCM24 samples", () => {
    const ab = audioBufferToWav24(fakeStereoBuffer());
    const view = new DataView(ab);
    expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe(
      "RIFF",
    );
    expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe(
      "WAVE",
    );
    expect(view.getUint16(34, true)).toBe(24);
    const dataOffset = 44;
    const readI24 = (off: number) => {
      const b0 = view.getUint8(off);
      const b1 = view.getUint8(off + 1);
      const b2 = view.getUint8(off + 2);
      let v = b0 | (b1 << 8) | (b2 << 16);
      if (v & 0x800000) v |= ~0xffffff;
      return v;
    };
    const s0 = readI24(dataOffset);
    expect(s0).toBeGreaterThan(0);
  });
});
