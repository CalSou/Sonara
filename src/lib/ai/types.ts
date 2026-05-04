export type StemKind = "vocals" | "drums" | "bass" | "other";

export interface GenerateOptions {
  prompt: string;
  durationSec: number;
  /** Catalogue genre id (see `src/lib/music/genres.ts`) */
  genreId?: string;
  bpm?: number;
  keySignature?: string;
}

export interface GenerationResult {
  buffer: AudioBuffer;
  prompt: string;
  bpm: number;
  durationSec: number;
}

export interface StemResult {
  stems: Record<StemKind, AudioBuffer>;
  sourceDurationSec: number;
}

export interface MasterOptions {
  loudnessLufs?: number; // target -14 LUFS for streaming
  brightness?: number; // -1..+1
  punch?: number; // 0..1
}

export interface MasteringResult {
  buffer: AudioBuffer;
  appliedGainDb: number;
  notes: string[];
}

export interface TrackAnalysis {
  bpm: number;
  keyCamelot: string; // e.g. "8A"
  keyMusical: string; // e.g. "Am"
  energy: number; // 0..1
  durationSec: number;
}

export interface TransitionPlan {
  fromTrackId: string;
  toTrackId: string;
  startInToSec: number;
  crossfadeDurationSec: number;
  bpmAdjustment: number; // semitones-equivalent ratio adjustment
  notes: string[];
}

export interface AutoSetlistResult {
  orderedTrackIds: string[];
  transitions: TransitionPlan[];
}
