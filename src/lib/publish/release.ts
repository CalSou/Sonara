import { z } from "zod";

/** PRD v1.1 release metadata for distributor handoff (stored in release_drafts.metadata_json) */
export const releaseMetadataSchema = z.object({
  releaseTitle: z.string().min(1).max(200),
  trackTitle: z.string().min(1).max(200),
  primaryArtist: z.string().min(1).max(200),
  featuredArtists: z.array(z.string().max(120)).max(20).optional(),
  genreId: z.string().min(1).max(64),
  language: z.string().min(2).max(16),
  explicit: z.boolean(),
  isrc: z.string().max(32).optional(),
  upc: z.string().max(32).optional(),
  releaseDate: z.string().max(32).optional(),
  composerCredits: z.string().max(4000).optional(),
  lyricsNotes: z.string().max(8000).optional(),
  /** Base64 data URL from browser file picker (MVP; replace with object storage later) */
  artworkDataUrl: z.string().max(12_000_000).optional(),
});

export type ReleaseMetadata = z.infer<typeof releaseMetadataSchema>;

export function parseReleaseMetadata(raw: unknown) {
  return releaseMetadataSchema.safeParse(raw);
}
