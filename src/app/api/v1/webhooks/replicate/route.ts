import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db/index";
import { audioAssets, generationJobs } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";
import type { GenerationJobInput, GenerationJobOutput } from "@/lib/ai/server/jobTypes";
import {
  extractReplicateAudioUrl,
  stringifyReplicateError,
} from "@/lib/ai/server/replicateOutput";
import { verifyStandardWebhookSignature } from "@/lib/ai/server/webhookSig";
import { uploadGeneratedWavToSupabase } from "@/lib/storage/supabaseGenerated";

type ReplicateWebhookBody = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: unknown;
};

export async function POST(req: Request) {
  const secret = process.env.REPLICATE_WEBHOOK_SIGNING_SECRET?.trim();
  if (!secret) {
    return jsonError(401, {
      error: "Webhook signing secret not configured",
      code: "WEBHOOK_DISABLED",
    });
  }

  const rawBody = await req.text();

  if (!verifyStandardWebhookSignature(rawBody, req.headers, secret)) {
    return jsonError(401, {
      error: "Invalid webhook signature",
      code: "INVALID_SIGNATURE",
    });
  }

  let body: ReplicateWebhookBody;
  try {
    body = JSON.parse(rawBody) as ReplicateWebhookBody;
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }

  const predictionId = body.id;
  if (!predictionId) {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const [job] = await db
    .select()
    .from(generationJobs)
    .where(eq(generationJobs.replicateId, predictionId))
    .limit(1);

  if (!job) {
    return NextResponse.json({ ok: true });
  }

  if (job.status === "complete") {
    return NextResponse.json({ ok: true });
  }

  const st = body.status ?? "";

  if (st === "failed" || st === "canceled") {
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorMessage: stringifyReplicateError(body.error),
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
    return NextResponse.json({ ok: true });
  }

  if (st !== "succeeded") {
    return NextResponse.json({ ok: true });
  }

  const replicateUrl = extractReplicateAudioUrl(body.output);
  if (!replicateUrl) {
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorMessage: "Missing audio output URL from provider.",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
    return NextResponse.json({ ok: true });
  }

  let audioBytes: Buffer;
  try {
    const res = await fetch(replicateUrl);
    if (!res.ok) {
      throw new Error(`download failed ${res.status}`);
    }
    audioBytes = Buffer.from(await res.arrayBuffer());
  } catch (e) {
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorMessage:
          e instanceof Error ? e.message.slice(0, 2000) : "download_failed",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
    return NextResponse.json({ ok: true });
  }

  const input = job.inputJson as GenerationJobInput | null;
  const prompt = input?.prompt ?? "Generated audio";
  const durationS = input?.durationSec ?? null;
  const bpmVal = input?.bpm ?? null;

  let audioUrl = replicateUrl;
  try {
    const uploaded = await uploadGeneratedWavToSupabase({
      userId: job.userId,
      jobId: job.id,
      bytes: audioBytes,
    });
    if (uploaded) audioUrl = uploaded;
  } catch {
    /* degraded: keep replicate CDN URL */
  }

  try {
    await db.transaction(async (tx) => {
      const [asset] = await tx
        .insert(audioAssets)
        .values({
          userId: job.userId,
          name: prompt.slice(0, 60),
          type: "generated",
          storageUrl: audioUrl,
          bpm: bpmVal,
          durationS,
        })
        .returning({ id: audioAssets.id });

      const outputPayload: GenerationJobOutput = {
        assetId: asset.id,
        audioUrl,
        replicateUrl,
      };

      await tx
        .update(generationJobs)
        .set({
          status: "complete",
          outputJson: outputPayload,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
    });
  } catch (e) {
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorMessage:
          e instanceof Error ? e.message.slice(0, 2000) : "persist_failed",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));
  }

  return NextResponse.json({ ok: true });
}
