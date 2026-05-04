import { jsonError } from "@/lib/api/errors";

/**
 * Spotify does not expose a public API for arbitrary third-party audio uploads to artist profiles.
 * Distribution is via aggregators / Spotify for Artists after delivery.
 */
export async function POST() {
  return jsonError(501, {
    error:
      "Spotify has no third-party upload API for mixes. Export WAV and deliver through your distributor, or use Spotify for Artists for releases ingested from labels.",
    code: "NOT_SUPPORTED",
  });
}
