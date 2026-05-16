/**
 * Minimal fake AudioContext for eval runners (no DOM).
 * Matches patterns used in `__tests__/ai/mockProviders.test.ts`.
 */
export function createEvalAudioContext(sampleRate = 44_100): AudioContext {
  return {
    sampleRate,
    createBuffer: (channels: number, length: number, sr: number) => {
      const channelData: Float32Array[] = [];
      for (let c = 0; c < channels; c++) {
        channelData.push(new Float32Array(length));
      }
      return {
        length,
        duration: length / sr,
        sampleRate: sr,
        numberOfChannels: channels,
        getChannelData: (ch: number) => channelData[ch]!,
        copyFromChannel: () => {},
        copyToChannel: () => {},
      } as unknown as AudioBuffer;
    },
  } as unknown as AudioContext;
}

/** Single-channel sine for stem / mastering smoke tests */
export function sineMonoBuffer(
  ctx: AudioContext,
  freqHz: number,
  seconds: number,
  amplitude = 0.25,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(seconds * sr);
  const buf = ctx.createBuffer(1, len, sr);
  const ch0 = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    ch0[i] = amplitude * Math.sin((2 * Math.PI * freqHz * i) / sr);
  }
  return buf;
}
