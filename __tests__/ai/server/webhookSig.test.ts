import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { decodeWebhookSecret, verifyStandardWebhookSignature } from "@/lib/ai/server/webhookSig";

function sign(secretRaw: string, id: string, ts: string, body: string): string {
  const key = decodeWebhookSecret(secretRaw);
  const signedContent = `${id}.${ts}.${body}`;
  return createHmac("sha256", key).update(signedContent, "utf8").digest("base64");
}

describe("decodeWebhookSecret", () => {
  it("decodes whsec_ prefix", () => {
    const raw = "hello";
    const prefixed = `whsec_${Buffer.from(raw).toString("base64")}`;
    expect(decodeWebhookSecret(prefixed).toString("utf8")).toBe(raw);
  });

  it("uses utf8 for raw secrets", () => {
    expect(decodeWebhookSecret("plain-secret").toString("utf8")).toBe("plain-secret");
  });
});

describe("verifyStandardWebhookSignature", () => {
  it("accepts a valid v1 signature", () => {
    const secret = "whsec_" + Buffer.from("test-secret-key").toString("base64");
    const id = "msg_abc";
    const ts = String(Math.floor(Date.now() / 1000));
    const body = '{"status":"succeeded","id":"pred1"}';
    const sig = sign(secret, id, ts, body);
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": `v1,${sig}`,
    });
    expect(verifyStandardWebhookSignature(body, headers, secret, Number(ts))).toBe(true);
  });

  it("rejects wrong signature", () => {
    const secret = "whsec_" + Buffer.from("test-secret-key").toString("base64");
    const id = "msg_abc";
    const ts = String(Math.floor(Date.now() / 1000));
    const body = "{}";
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": "v1," + Buffer.from("wrong").toString("base64"),
    });
    expect(verifyStandardWebhookSignature(body, headers, secret, Number(ts))).toBe(false);
  });

  it("rejects old timestamps", () => {
    const secret = "plain-secret";
    const id = "msg_abc";
    const ts = String(Math.floor(Date.now() / 1000) - 99999);
    const body = "{}";
    const sig = sign(secret, id, ts, body);
    const headers = new Headers({
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": `v1,${sig}`,
    });
    expect(verifyStandardWebhookSignature(body, headers, secret)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(verifyStandardWebhookSignature("{}", new Headers(), "secret")).toBe(false);
  });
});
