import { hasPublishTokenKey } from "@/lib/crypto/tokens";

/**
 * In production, publishing routes must not run without token encryption configured.
 * Development allows missing key so `next dev` works before `.env.local` is filled.
 */
export function assertPublishCryptoProduction(): void {
  if (process.env.NODE_ENV === "production" && !hasPublishTokenKey()) {
    throw new Error(
      "PUBLISH_TOKEN_KEY must be set in production for publishing routes (see docs/SECRETS_OPERATOR_GUIDE.md).",
    );
  }
}
