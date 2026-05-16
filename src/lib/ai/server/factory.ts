/** Phase 4 — resolves whether server-side Replicate generation is active. */

export type AiGenerationBackend = "mock" | "replicate";

/**
 * Effective backend for `/api/v1/generate`.
 * `replicate` only when explicitly requested via AI_PROVIDER, token, and DATABASE_URL are all present.
 */
export function resolveEffectiveAiGenerationBackend(): AiGenerationBackend {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase().trim();
  const token = process.env.REPLICATE_API_TOKEN?.trim();
  const dbUrl = process.env.DATABASE_URL?.trim();

  if (provider === "replicate" && Boolean(token) && Boolean(dbUrl)) {
    return "replicate";
  }
  return "mock";
}

/** Public base URL for webhook callback (no trailing slash). */
export function getPublicWebhookBaseUrl(): string {
  const override = process.env.REPLICATE_WEBHOOK_PUBLIC_BASE_URL?.trim();
  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  const base = override || nextAuth || "http://localhost:3000";
  return base.replace(/\/+$/, "");
}
