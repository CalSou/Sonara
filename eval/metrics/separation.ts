/**
 * Scale-invariant SDR (single-channel, equal length).
 * Higher is better (unbounded upper; 0 means noise-like error).
 */
export function siSdr(reference: Float32Array, estimate: Float32Array): number {
  const n = Math.min(reference.length, estimate.length);
  if (n < 1) return -Infinity;

  let dot = 0;
  let refEnergy = 0;
  for (let i = 0; i < n; i++) {
    const r = reference[i]!;
    dot += r * estimate[i]!;
    refEnergy += r * r;
  }

  if (refEnergy < 1e-18) return 0;

  const scale = dot / refEnergy;
  let noiseEnergy = 0;
  for (let i = 0; i < n; i++) {
    const e = scale * reference[i]! - estimate[i]!;
    noiseEnergy += e * e;
  }

  return 10 * Math.log10((scale * scale * refEnergy) / (noiseEnergy + 1e-18));
}
