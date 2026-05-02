import type {
  AutoSetlistResult,
  GenerateOptions,
  GenerationResult,
  MasterOptions,
  MasteringResult,
  StemResult,
  TrackAnalysis,
  TransitionPlan,
} from "./types";

/**
 * Provider interfaces. Each surface is intentionally narrow so that swapping
 * the mock for a real backend (Replicate, Demucs, MusicGen, Stable Audio,
 * a self-hosted Python service, etc.) requires no UI changes.
 */
export interface MusicGenerationProvider {
  generate(opts: GenerateOptions, ctx: AudioContext): Promise<GenerationResult>;
}

export interface StemSeparationProvider {
  separate(buffer: AudioBuffer, ctx: AudioContext): Promise<StemResult>;
}

export interface MasteringProvider {
  master(
    buffer: AudioBuffer,
    opts: MasterOptions,
    ctx: AudioContext,
  ): Promise<MasteringResult>;
}

export interface TrackAnalysisProvider {
  analyze(buffer: AudioBuffer): Promise<TrackAnalysis>;
}

export interface AutoMixProvider {
  planTransition(
    a: { id: string; analysis: TrackAnalysis },
    b: { id: string; analysis: TrackAnalysis },
  ): Promise<TransitionPlan>;
  buildSetlist(
    tracks: { id: string; analysis: TrackAnalysis }[],
  ): Promise<AutoSetlistResult>;
}

export interface AIProviders {
  generation: MusicGenerationProvider;
  stems: StemSeparationProvider;
  mastering: MasteringProvider;
  analysis: TrackAnalysisProvider;
  autoMix: AutoMixProvider;
}
