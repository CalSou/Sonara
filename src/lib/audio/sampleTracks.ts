"use client";

/**
 * Procedural "sample tracks" so the DJ library isn't empty out of the box.
 * Each generates a 30-60s loopable groove in a different style/BPM/key.
 */

interface SampleSpec {
  name: string;
  bpm: number;
  rootHz: number;
  scale: number[];
  artwork: string;
  durationSec: number;
  vibe: "house" | "techno" | "lofi" | "trance" | "dnb" | "ambient";
}

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

const SAMPLES: SampleSpec[] = [
  { name: "Midnight Cruise", bpm: 122, rootHz: 261.63, scale: SCALES.minor, artwork: "#a855f7", durationSec: 32, vibe: "house" },
  { name: "Iron Pulse",      bpm: 132, rootHz: 174.61, scale: SCALES.phrygian, artwork: "#22d3ee", durationSec: 32, vibe: "techno" },
  { name: "Velvet Tape",     bpm: 84,  rootHz: 220.00, scale: SCALES.minor, artwork: "#ec4899", durationSec: 28, vibe: "lofi" },
  { name: "Aurora Lift",     bpm: 138, rootHz: 293.66, scale: SCALES.dorian, artwork: "#10b981", durationSec: 32, vibe: "trance" },
  { name: "Concrete Forest", bpm: 174, rootHz: 196.00, scale: SCALES.minor, artwork: "#f59e0b", durationSec: 24, vibe: "dnb" },
  { name: "Slow Tides",      bpm: 70,  rootHz: 130.81, scale: SCALES.dorian, artwork: "#60a5fa", durationSec: 36, vibe: "ambient" },
];

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

function renderSample(ctx: AudioContext, spec: SampleSpec): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.floor(spec.durationSec * sr);
  const buf = ctx.createBuffer(2, len, sr);
  const beat = 60 / spec.bpm;
  const rand = seeded(
    spec.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
  );

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const beatPos = (t % beat) / beat;
      const beatIdx = Math.floor(t / beat);
      const bar16 = beatIdx % 16;

      // Kick
      let kickAmp = 0.65;
      if (spec.vibe === "ambient") kickAmp = 0.25;
      if (spec.vibe === "lofi") kickAmp = 0.55;
      const kickEnv = Math.exp(-beatPos * 16);
      const kickFreq = 60 - beatPos * 35;
      const kick =
        Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * kickAmp *
        (spec.vibe === "ambient" && beatIdx % 4 !== 0 ? 0.4 : 1);

      // Hat / breaks
      const hatPos = ((t + beat / 2) % beat) / beat;
      const hatEnv = Math.exp(-hatPos * 70);
      const hat = (rand() * 2 - 1) * hatEnv * 0.18;

      // Snare on 2 & 4
      const isBackbeat = beatIdx % 2 === 1;
      const snareEnv = isBackbeat ? Math.exp(-beatPos * 25) : 0;
      const snare = ((rand() * 2 - 1) * 0.4 + Math.sin(2 * Math.PI * 200 * t) * 0.2) *
        snareEnv * 0.35;

      // Bass — root + fifth alternating per bar
      const bassNote = (bar16 % 4 === 0 ? 0 : bar16 % 4 === 2 ? 7 : 0);
      const bassFreq = (spec.rootHz / 2) * Math.pow(2, bassNote / 12);
      const bassEnv = 0.6 + 0.3 * Math.sin(2 * Math.PI * 0.5 * t);
      const bass = Math.sin(2 * Math.PI * bassFreq * t) * bassEnv * 0.32;

      // Lead — stepped scale melody
      const noteIdx = spec.scale[bar16 % spec.scale.length];
      const leadFreq = spec.rootHz * Math.pow(2, noteIdx / 12);
      const leadEnv = Math.max(0, Math.sin(Math.PI * beatPos)) ** 1.5 * 0.18;
      const lead =
        (Math.sin(2 * Math.PI * leadFreq * t) * 0.7 +
          Math.sin(2 * Math.PI * leadFreq * 2 * t) * 0.2) *
        leadEnv;

      // Pad — slow root chord
      const pad =
        (Math.sin(2 * Math.PI * spec.rootHz * t) +
          Math.sin(2 * Math.PI * spec.rootHz * 1.25 * t) +
          Math.sin(2 * Math.PI * spec.rootHz * 1.5 * t)) *
        0.04 *
        (spec.vibe === "ambient" ? 1.8 : 1);

      // Stereo widening
      const phase = ch === 0 ? 0 : 0.0008;
      const widen = Math.sin(2 * Math.PI * (leadFreq + phase * sr) * t) * 0.02;

      data[i] = Math.tanh(kick + hat + snare + bass + lead + pad + widen);
    }
  }
  return buf;
}

export function buildStarterLibrary(ctx: AudioContext) {
  return SAMPLES.map((spec) => ({
    spec,
    buffer: renderSample(ctx, spec),
  }));
}

export function specToAnalysis(spec: SampleSpec) {
  const camelotBy: Record<string, string> = {
    house: "8A",
    techno: "11A",
    lofi: "5A",
    trance: "9A",
    dnb: "12A",
    ambient: "4A",
  };
  const musicalBy: Record<string, string> = {
    house: "Am",
    techno: "Bbm",
    lofi: "Dm",
    trance: "Em",
    dnb: "Fm",
    ambient: "F#m",
  };
  const energyBy: Record<string, number> = {
    ambient: 0.25,
    lofi: 0.4,
    house: 0.7,
    trance: 0.8,
    techno: 0.85,
    dnb: 0.95,
  };
  return {
    bpm: spec.bpm,
    keyCamelot: camelotBy[spec.vibe],
    keyMusical: musicalBy[spec.vibe],
    energy: energyBy[spec.vibe],
    durationSec: spec.durationSec,
  };
}
