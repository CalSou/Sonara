import { jsonError } from "@/lib/api/errors";

/**
 * Placeholder for YouTube Data API v3 resumable upload (videos.insert).
 * Requires Google OAuth with youtube.upload scope and a server-side token exchange.
 *
 * @see https://developers.google.com/youtube/v3/guides/uploading_a_video
 */
export async function POST() {
  return jsonError(501, {
    error:
      "YouTube upload not implemented yet. Use Export WAV and upload via YouTube Studio, or implement OAuth + resumable upload per docs/publishing-third-party.md.",
    code: "NOT_IMPLEMENTED",
  });
}
