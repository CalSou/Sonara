/** Compute downsampled peaks (min/max per bucket) for waveform rendering. */
export function computePeaks(buffer: AudioBuffer, buckets = 1024): number[] {
  const ch0 = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(ch0.length / buckets));
  const peaks: number[] = new Array(buckets);
  for (let i = 0; i < buckets; i++) {
    const start = i * blockSize;
    let max = 0;
    for (let j = 0; j < blockSize; j++) {
      const v = Math.abs(ch0[start + j] || 0);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }
  // normalize
  let m = 0;
  for (const p of peaks) if (p > m) m = p;
  if (m > 0) for (let i = 0; i < peaks.length; i++) peaks[i] /= m;
  return peaks;
}
