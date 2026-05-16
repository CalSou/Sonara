import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "v1.";
const IV_LEN = 12;
const TAG_LEN = 16;

function keyBytes(): Buffer {
  const raw = process.env.PUBLISH_TOKEN_KEY;
  if (!raw?.trim()) {
    throw new Error(
      "PUBLISH_TOKEN_KEY is not set. Generate a 32-byte key encoded as base64 (see docs/SECRETS_OPERATOR_GUIDE.md).",
    );
  }
  const buf = Buffer.from(raw.trim(), "base64");
  if (buf.length !== 32) {
    throw new Error("PUBLISH_TOKEN_KEY must decode to exactly 32 bytes (base64).");
  }
  return buf;
}

/** AES-256-GCM ciphertext: v1.<iv>.<tag>.<ciphertext> (all base64url except prefix) */
export function encryptToken(plaintext: string): string {
  const key = keyBytes();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const ivB64 = iv.toString("base64url");
  const tagB64 = tag.toString("base64url");
  const ctB64 = enc.toString("base64url");
  return `${PREFIX}${ivB64}.${tagB64}.${ctB64}`;
}

export function decryptToken(ciphertext: string): string {
  if (!ciphertext.startsWith(PREFIX)) {
    throw new Error("Unsupported token ciphertext version");
  }
  const rest = ciphertext.slice(PREFIX.length);
  const parts = rest.split(".");
  if (parts.length !== 3) throw new Error("Malformed ciphertext");
  const [ivB64, tagB64, ctB64] = parts;
  const key = keyBytes();
  const iv = Buffer.from(ivB64!, "base64url");
  const tag = Buffer.from(tagB64!, "base64url");
  const data = Buffer.from(ctB64!, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function hasPublishTokenKey(): boolean {
  return Boolean(process.env.PUBLISH_TOKEN_KEY?.trim());
}
