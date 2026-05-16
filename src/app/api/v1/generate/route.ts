import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { generationJobs } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";
import { sumGenerationSecondsToday, parseDailySecondsLimit } from "@/lib/ai/server/dailyGenerationBudget";
import {
  getPublicWebhookBaseUrl,
  resolveEffectiveAiGenerationBackend,
} from "@/lib/ai/server/factory";
import { buildStableAudioPrompt } from "@/lib/ai/server/generationPrompt";
import type { GenerationJobInput } from "@/lib/ai/server/jobTypes";
import { createReplicatePrediction } from "@/lib/ai/server/replicate";

const bodySchema = z.object({
  prompt: z.string().trim().min(1).max(500),
  durationSec: z.number().finite().min(1).max(47),
  genreId: z.string().trim().min(1).max(64).optional(),
  bpm: z.number().finite().optional(),
  seed: z.number().int().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const backend = resolveEffectiveAiGenerationBackend();
  if (backend !== "replicate") {
    const wantsReplicate =
      (process.env.AI_PROVIDER ?? "").toLowerCase().trim() === "replicate";
    if (wantsReplicate) {
      console.warn(
        "[ai] AI_PROVIDER=replicate but REPLICATE_API_TOKEN or DATABASE_URL missing; /api/v1/generate unavailable.",
      );
    }
    return jsonError(503, {
      error: "Server-side generation is not configured.",
      code: "GENERATION_UNAVAILABLE",
    });
  }

  const token = process.env.REPLICATE_API_TOKEN?.trim();
  const version = process.env.REPLICATE_STABLE_AUDIO_VERSION?.trim();
  if (!token) {
    return jsonError(503, {
      error: "REPLICATE_API_TOKEN is not set.",
      code: "GENERATION_MISCONFIGURED",
    });
  }
  if (!version) {
    return jsonError(503, {
      error: "REPLICATE_STABLE_AUDIO_VERSION is not set.",
      code: "GENERATION_MISCONFIGURED",
    });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    const r = bodySchema.safeParse(raw);
    if (!r.success) {
      return jsonError(400, {
        error: r.error.flatten().formErrors.join("; ") || "Validation failed",
        code: "VALIDATION_ERROR",
      });
    }
    parsed = r.data;
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }

  const db = requireDb();
  const userId = session.user.id;

  const used = await sumGenerationSecondsToday(db, userId);
  const limit = parseDailySecondsLimit();
  if (used + parsed.durationSec > limit) {
    return jsonError(429, {
      error: "Daily generation budget exceeded.",
      code: "DAILY_LIMIT",
    });
  }

  const jobId = crypto.randomUUID();
  const inputPayload: GenerationJobInput = {
    prompt: parsed.prompt,
    durationSec: parsed.durationSec,
    genreId: parsed.genreId,
    bpm: parsed.bpm,
    seed: parsed.seed,
  };

  await db.insert(generationJobs).values({
    id: jobId,
    userId,
    type: "generate",
    status: "pending",
    inputJson: inputPayload,
  });

  const webhook = `${getPublicWebhookBaseUrl()}/api/v1/webhooks/replicate`;

  const stableInput: Record<string, unknown> = {
    prompt: buildStableAudioPrompt(parsed.prompt, parsed.genreId),
    seconds_total: Math.round(parsed.durationSec),
  };
  if (parsed.seed !== undefined) stableInput.seed = parsed.seed;

  try {
    const pred = await createReplicatePrediction(token, {
      version,
      input: stableInput,
      webhook,
      idempotencyKey: jobId,
    });

    await db
      .update(generationJobs)
      .set({
        replicateId: pred.id,
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        errorMessage: msg.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));

    return jsonError(502, {
      error: "Failed to start generation provider.",
      code: "PROVIDER_ERROR",
    });
  }

  return NextResponse.json(
    { job_id: jobId, status: "pending" },
    { status: 202 },
  );
}
