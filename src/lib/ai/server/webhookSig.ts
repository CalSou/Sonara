import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_SKEW_SEC = 300;

/** Decode Svix-style webhook secret (`whsec_<base64>`) or raw UTF-8 string. */
export function decodeWebhookSecret(secret: string): Buffer {
  const s = secret.trim();
  if (s.startsWith("whsec_")) {
    return Buffer.from(s.slice("whsec_".length), "base64");
  }
  return Buffer.from(s, "utf8");
}

/**
 * Verify Standard Webhooks / Svix-style signatures (used by Replicate).
 * Signed payload: `${webhook-id}.${webhook-timestamp}.${rawBody}`
 */
export function verifyStandardWebhookSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  const id = headers.get("webhook-id");
  const tsStr = headers.get("webhook-timestamp");
  const sigHeader = headers.get("webhook-signature");
  if (!id || !tsStr || !sigHeader) return false;

  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(nowSec - ts) > MAX_SKEW_SEC) return false;

  let key: Buffer;
  try {
    key = decodeWebhookSecret(secret);
  } catch {
    return false;
  }

  const signedContent = `${id}.${tsStr}.${rawBody}`;
  const mac = createHmac("sha256", key).update(signedContent, "utf8").digest();

  for (const part of sigHeader.trim().split(/\s+/)) {
    const [version, encoded] = part.split(",", 2);
    if (version !== "v1" || !encoded) continue;
    try {
      const theirs = Buffer.from(encoded, "base64");
      if (theirs.length !== mac.length) continue;
      if (timingSafeEqual(theirs, mac)) return true;
    } catch {
      /* malformed base64 */
    }
  }
  return false;
}
