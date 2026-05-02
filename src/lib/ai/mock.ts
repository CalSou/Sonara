import type {
  AIProviders,
  AutoMixProvider,
  MasteringProvider,
  MusicGenerationProvider,
  StemSeparationProvider,
  TrackAnalysisProvider,
} from "./providers";
import type {
  AutoSetlistResult,
  GenerateOptions,
  GenerationResult,
  MasterOptions,
  MasteringResult,
  StemKind,
  StemResult,
  TrackAnalysis,
  TransitionPlan,
} from "./types";

/**
 * Mock AI providers.
 *
 * These exist so the entire UI/UX can be exercised without paying for or
 * shipping real models. The synthesis is intentionally musical-ish: we
 * generate procedural audio with envelopes and harmonic content so the
 * waveforms look interesting and play back convincingly.
 *
 * Replace any of these with a real implementation that talks to a Python
 * service / Replicate / Demucs / etc. — the interfaces stay identical.
 */

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function hash(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number) {
  let s = seed || 1;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  };
}

/** Build a stereo AudioBuffer using a per-sample synthesis function. */
function synth(
  ctx: AudioContext,
  durationSec: number,
  fn: (t: number, ch: 0 | 1, rand: () => number) => number,
): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.max(1, Math.floor(durationSec * sr));
  const buf = ctx.createBuffer(2, len, sr);
  const rand = seeded(0xc0ffee);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = fn(i / sr, ch as 0 | 1, rand);
    }
  }
  return buf;
}

/* ----------------------------- Generation -------------------------------- */

const promptVibes: { match: RegExp; bpm: number; root: number }[] = [
  { match: /lofi|chill|study/i, bpm: 78, root: 220 },
  { match: /house|disco|club/i, bpm: 124, root: 261.63 },
  { match: /techno|industrial/i, bpm: 132, root: 174.61 },
  { match: /trance|euphoric/i, bpm: 138, root: 293.66 },
  { match: /dnb|drum.?and.?bass|jungle/i, bpm: 174, root: 196 },
  { match: /trap|hip.?hop|rap/i, bpm: 90, root: 110 },
  { match: /ambient|drone|cinematic/i, bpm: 70, root: 130.81 },
  { match: /jazz|swing/i, bpm: 110, root: 233.08 },
  { match: /rock|punk|metal/i, bpm: 128, root: 164.81 },
  { match: /reggae|dub/i, bpm: 76, root: 146.83 },
];

function inferVibe(prompt: string) {
  for (const v of promptVibes) if (v.match.test(prompt)) return v;
  return { bpm: 120, root: 220 };
}

class MockGeneration implements MusicGenerationProvider {
  async generate(
    opts: GenerateOptions,
    ctx: AudioContext,
  ): Promise<GenerationResult> {
    await sleep(900 + Math.random() * 600);
    const vibe = inferVibe(opts.prompt);
    const bpm = opts.bpm ?? vibe.bpm;
    const beat = 60 / bpm;
    const root = vibe.root;
    const scale = [0, 2, 3, 5, 7, 8, 10]; // natural minor degrees
    const seedRand = seeded(hash(opts.prompt));

    const buffer = synth(ctx, opts.durationSec, (t, ch) => {
      const beatPos = (t % beat) / beat;
      const barPos = Math.floor(t / beat) % 16;

      // Kick on every beat
      const kickEnv = Math.exp(-beatPos * 18);
      const kick = Math.sin(2 * Math.PI * (60 - beatPos * 40) * t) * kickEnv * 0.6;

      // Hi-hat on offbeats
      const hatPos = ((t + beat / 2) % beat) / beat;
      const hatEnv = Math.exp(-hatPos * 60);
      const noise = (seedRand() * 2 - 1) * hatEnv * 0.15;

      // Bass: root note pulsing
      const bass =
        Math.sin(2 * Math.PI * (root / 2) * t) *
        (0.3 + 0.2 * Math.sin(2 * Math.PI * 0.5 * t));

      // Lead: stepped melody from scale
      const noteIdx = scale[barPos % scale.length];
      const noteFreq = root * Math.pow(2, noteIdx / 12);
      const lead =
        Math.sin(2 * Math.PI * noteFreq * t) * 0.18 +
        Math.sin(2 * Math.PI * noteFreq * 2 * t) * 0.06;

      // Slight stereo widen via phase offset
      const phase = ch === 0 ? 0 : 0.0009;
      const sample =
        kick + noise + bass * 0.5 + lead * Math.sin(2 * Math.PI * (noteFreq + phase) * t) * 0.5;

      // master soft-clip
      return Math.tanh(sample * 0.9);
    });

    return {
      buffer,
      prompt: opts.prompt,
      bpm,
      durationSec: opts.durationSec,
    };
  }
}

/* ---------------------------- Stem separation ---------------------------- */

class MockStems implements StemSeparationProvider {
  async separate(buffer: AudioBuffer, ctx: AudioContext): Promise<StemResult> {
    await sleep(1400);
    const sr = buffer.sampleRate;
    const len = buffer.length;

    // Simple frequency-band split: lowpass=bass, bandpass=drums, highpass=vocals,
    // residual=other. This is obviously not ML stem separation, but it produces
    // four playable, distinct AudioBuffers that demo the surface convincingly.
    const stems: Record<StemKind, AudioBuffer> = {
      vocals: ctx.createBuffer(buffer.numberOfChannels, len, sr),
      drums: ctx.createBuffer(buffer.numberOfChannels, len, sr),
      bass: ctx.createBuffer(buffer.numberOfChannels, len, sr),
      other: ctx.createBuffer(buffer.numberOfChannels, len, sr),
    };

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const v = stems.vocals.getChannelData(ch);
      const d = stems.drums.getChannelData(ch);
      const b = stems.bass.getChannelData(ch);
      const o = stems.other.getChannelData(ch);

      // Single-pole filter coefficients (rough)
      const aLow = 0.02; // lowpass alpha
      const aHigh = 0.85; // highpass coefficient

      let lp = 0;
      let prev = 0;
      let hp = 0;
      for (let i = 0; i < len; i++) {
        const x = src[i];
        lp = lp + aLow * (x - lp);
        hp = aHigh * (hp + x - prev);
        prev = x;
        const mid = x - lp - hp; // band-ish
        b[i] = lp * 1.4;
        v[i] = hp * 1.2;
        d[i] = mid * 1.1;
        o[i] = (x - (b[i] + v[i] + d[i])) * 0.8;
      }
    }

    return { stems, sourceDurationSec: buffer.duration };
  }
}

/* ------------------------------ Mastering -------------------------------- */

class MockMastering implements MasteringProvider {
  async master(
    buffer: AudioBuffer,
    opts: MasterOptions,
    ctx: AudioContext,
  ): Promise<MasteringResult> {
    await sleep(900);
    const targetLufs = opts.loudnessLufs ?? -14;
    const punch = opts.punch ?? 0.5;
    const brightness = opts.brightness ?? 0;

    // Compute peak
    let peak = 0;
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < data.length; i++) {
        const a = Math.abs(data[i]);
        if (a > peak) peak = a;
      }
    }
    const headroom = 0.98 / Math.max(0.0001, peak);
    const gain = Math.min(headroom, Math.pow(10, (targetLufs + 14) / 20) * 1.4);

    const out = ctx.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate,
    );
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      // Single-pole "tilt" eq: brightness > 0 boosts highs.
      const aHigh = 0.6 + 0.3 * brightness;
      let prev = 0;
      let hp = 0;
      for (let i = 0; i < src.length; i++) {
        const x = src[i] * gain;
        hp = aHigh * (hp + x - prev);
        prev = x;
        const tilted = x + hp * brightness * 0.35;
        // soft compression
        const compressed = Math.tanh(tilted * (1 + punch));
        dst[i] = compressed * 0.9;
      }
    }

    return {
      buffer: out,
      appliedGainDb: 20 * Math.log10(gain || 1),
      notes: [
        `Targeting ${targetLufs} LUFS`,
        `Applied ${(20 * Math.log10(gain || 1)).toFixed(1)} dB gain`,
        brightness > 0 ? "Tilt EQ +highs" : brightness < 0 ? "Tilt EQ -highs" : "Flat EQ",
        `Punch ${(punch * 100).toFixed(0)}%`,
      ],
    };
  }
}

/* -------------------------------- Analysis ------------------------------- */

const camelot = [
  "1A", "8A", "3A", "10A", "5A", "12A", "7A", "2A", "9A", "4A", "11A", "6A",
];
const musical = ["Am", "Em", "Bm", "F#m", "C#m", "G#m", "D#m", "Bbm", "Fm", "Cm", "Gm", "Dm"];

class MockAnalysis implements TrackAnalysisProvider {
  async analyze(buffer: AudioBuffer): Promise<TrackAnalysis> {
    await sleep(250);
    // Naïve "energy" via RMS
    let sumSq = 0;
    let n = 0;
    const data = buffer.getChannelData(0);
    const stride = Math.max(1, Math.floor(data.length / 8000));
    for (let i = 0; i < data.length; i += stride) {
      sumSq += data[i] * data[i];
      n++;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, n));
    const energy = Math.max(0, Math.min(1, rms * 3));

    // Pseudo-BPM derived from buffer length so it feels deterministic
    const seed = Math.floor(buffer.duration * 1000) ^ buffer.length;
    const r = seeded(seed);
    const bpm = Math.round(90 + r() * 70); // 90..160
    const idx = Math.floor(r() * 12);

    return {
      bpm,
      keyCamelot: camelot[idx],
      keyMusical: musical[idx],
      energy,
      durationSec: buffer.duration,
    };
  }
}

/* ------------------------------- Auto Mix -------------------------------- */

function ratioFromBpm(from: number, to: number) {
  return to / from;
}

class MockAutoMix implements AutoMixProvider {
  async planTransition(
    a: { id: string; analysis: TrackAnalysis },
    b: { id: string; analysis: TrackAnalysis },
  ): Promise<TransitionPlan> {
    await sleep(300);
    const ratio = ratioFromBpm(b.analysis.bpm, a.analysis.bpm);
    const sameKey = a.analysis.keyCamelot === b.analysis.keyCamelot;
    return {
      fromTrackId: a.id,
      toTrackId: b.id,
      startInToSec: 16,
      crossfadeDurationSec: sameKey ? 16 : 8,
      bpmAdjustment: ratio,
      notes: [
        `Beatmatch ${a.analysis.bpm}→${b.analysis.bpm} BPM`,
        sameKey
          ? `Harmonic match (${a.analysis.keyCamelot})`
          : `Key change ${a.analysis.keyCamelot}→${b.analysis.keyCamelot} — apply EQ swap`,
        sameKey ? "Long blend (16 bars)" : "Short blend (8 bars)",
      ],
    };
  }

  async buildSetlist(
    tracks: { id: string; analysis: TrackAnalysis }[],
  ): Promise<AutoSetlistResult> {
    await sleep(500);
    // Order by energy ascending then by bpm — a credible warm-up arc.
    const ordered = [...tracks].sort((x, y) => {
      const e = x.analysis.energy - y.analysis.energy;
      if (Math.abs(e) > 0.05) return e;
      return x.analysis.bpm - y.analysis.bpm;
    });

    const transitions: TransitionPlan[] = [];
    for (let i = 0; i < ordered.length - 1; i++) {
      transitions.push(await this.planTransition(ordered[i], ordered[i + 1]));
    }
    return {
      orderedTrackIds: ordered.map((t) => t.id),
      transitions,
    };
  }
}

/* -------------------------------- Export --------------------------------- */

export const mockProviders: AIProviders = {
  generation: new MockGeneration(),
  stems: new MockStems(),
  mastering: new MockMastering(),
  analysis: new MockAnalysis(),
  autoMix: new MockAutoMix(),
};
