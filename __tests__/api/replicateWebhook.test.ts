import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { decodeWebhookSecret } from "@/lib/ai/server/webhookSig";

function sign(secretRaw: string, id: string, ts: string, body: string): string {
  const key = decodeWebhookSecret(secretRaw);
  const signedContent = `${id}.${ts}.${body}`;
  return createHmac("sha256", key).update(signedContent, "utf8").digest("base64");
}

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  upload: vi.fn(),
}));

vi.mock("@/db/index", () => ({
  getDb: () => mocks.getDb(),
}));

vi.mock("@/lib/storage/supabaseGenerated", () => ({
  uploadGeneratedWavToSupabase: (...args: unknown[]) => mocks.upload(...args),
}));

import { POST } from "@/app/api/v1/webhooks/replicate/route";

describe("POST /api/v1/webhooks/replicate", () => {
  const secret = `whsec_${Buffer.from("wh-secret").toString("base64")}`;

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.stubEnv("REPLICATE_WEBHOOK_SIGNING_SECRET", secret);
    mocks.upload.mockResolvedValue(null);
    mocks.getDb.mockReset();
  });

  it("returns 401 when signing secret missing", async () => {
    vi.stubEnv("REPLICATE_WEBHOOK_SIGNING_SECRET", "   ");
    const res = await POST(new Request("http://localhost", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature invalid", async () => {
    const body = '{"id":"p1","status":"succeeded"}';
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "webhook-signature": "v1,aaaa" },
        body,
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 200 for unknown prediction id (verified)", async () => {
    mocks.getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    });
    const webhookId = "msg_x";
    const ts = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({
      id: "unknown-pred",
      status: "succeeded",
      output: "https://audio/wav",
    });
    const sig = sign(secret, webhookId, ts, raw);
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "webhook-id": webhookId,
          "webhook-timestamp": ts,
          "webhook-signature": `v1,${sig}`,
        },
        body: raw,
      }),
    );
    expect(res.status).toBe(200);
  });

  it("marks job complete and uploads asset", async () => {
    const jobRow = {
      id: "job-uuid",
      userId: "u1",
      replicateId: "pred-x",
      status: "processing" as const,
      inputJson: { prompt: "p", durationSec: 8 },
    };
    const txInsertReturning = vi.fn().mockResolvedValue([{ id: "asset-id" }]);
    const txUpdateWhere = vi.fn().mockResolvedValue(undefined);

    mocks.getDb.mockReturnValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([jobRow]),
          }),
        }),
      }),
      transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => {
        await fn({
          insert: () => ({
            values: () => ({
              returning: txInsertReturning,
            }),
          }),
          update: () => ({
            set: () => ({
              where: txUpdateWhere,
            }),
          }),
        });
      }),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(Buffer.from("fake-wav"), { status: 200 })),
    );

    const webhookId = "msg_pred";
    const ts = String(Math.floor(Date.now() / 1000));
    const raw = JSON.stringify({
      id: "pred-x",
      status: "succeeded",
      output: "https://replicate.example/out.wav",
    });
    const sig = sign(secret, webhookId, ts, raw);

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: {
          "webhook-id": webhookId,
          "webhook-timestamp": ts,
          "webhook-signature": `v1,${sig}`,
        },
        body: raw,
      }),
    );

    expect(res.status).toBe(200);
    expect(txInsertReturning).toHaveBeenCalled();
    expect(txUpdateWhere).toHaveBeenCalled();
  });
});
