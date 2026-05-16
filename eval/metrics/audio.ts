/** RMS energy averaged across all channels and samples (linear domain average of squares). */
export function meanSquare(buffer: AudioBuffer): number {
  let sum = 0;
  let n = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const x = d[i];
      sum += x * x;
      n++;
    }
  }
  return n > 0 ? sum / n : 0;
}

/** RMS level in dBFS (relative metric). */
export function rmsDb(buffer: AudioBuffer): number {
  const ms = meanSquare(buffer);
  return 10 * Math.log10(ms + 1e-18);
}

/** Simple true-peak estimate: max absolute sample after 4× linear upsampling per channel. */
export function truePeakDbApprox(buffer: AudioBuffer): number {
  let peak = 0;
  const phases = [0, 0.25, 0.5, 0.75];
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const d = buffer.getChannelData(ch);
    for (let i = 0; i < d.length - 1; i++) {
      for (const ph of phases) {
        const x = d[i] * (1 - ph) + d[i + 1] * ph;
        peak = Math.max(peak, Math.abs(x));
      }
    }
    peak = Math.max(peak, Math.abs(d[d.length - 1] ?? 0));
  }
  return 20 * Math.log10(Math.max(peak, 1e-12));
}
