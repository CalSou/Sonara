"use client";

let _ctx: AudioContext | null = null;

/** Lazily acquire a single shared AudioContext. Must be called from a user gesture. */
export function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("AudioContext is only available in the browser");
  }
  if (!_ctx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    _ctx = new Ctx();
  }
  if (_ctx.state === "suspended") {
    void _ctx.resume();
  }
  return _ctx;
}

export async function decodeFileToBuffer(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const ab = await file.arrayBuffer();
  return ctx.decodeAudioData(ab.slice(0));
}

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length * numCh * 2;
  const ab = new ArrayBuffer(44 + len);
  const view = new DataView(ab);
  let offset = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };
  writeStr("RIFF");
  view.setUint32(offset, 36 + len, true); offset += 4;
  writeStr("WAVE");
  writeStr("fmt ");
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numCh, true); offset += 2;
  view.setUint32(offset, sr, true); offset += 4;
  view.setUint32(offset, sr * numCh * 2, true); offset += 4;
  view.setUint16(offset, numCh * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeStr("data");
  view.setUint32(offset, len, true); offset += 4;

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}
