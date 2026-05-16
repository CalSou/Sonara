/** Normalize Replicate prediction `output` to an HTTP(S) audio URL. */
export function extractReplicateAudioUrl(output: unknown): string | null {
  if (typeof output === "string" && /^https?:\/\//i.test(output)) {
    return output;
  }
  if (Array.isArray(output)) {
    for (const item of output) {
      if (typeof item === "string" && /^https?:\/\//i.test(item)) return item;
    }
  }
  return null;
}

export function stringifyReplicateError(error: unknown): string {
  if (typeof error === "string") return error.slice(0, 2000);
  try {
    return JSON.stringify(error).slice(0, 2000);
  } catch {
    return "unknown_error";
  }
}
