/** Stored in `generation_jobs.input_json` / API request body (Phase 4 generate). */
export type GenerationJobInput = {
  prompt: string;
  durationSec: number;
  genreId?: string;
  bpm?: number;
  seed?: number;
};

/** Stored in `generation_jobs.output_json` on success. */
export type GenerationJobOutput = {
  assetId: string;
  audioUrl: string;
  replicateUrl: string;
};
