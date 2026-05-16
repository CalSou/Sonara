import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { generationJobs } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";
import type { GenerationJobInput, GenerationJobOutput } from "@/lib/ai/server/jobTypes";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const { id } = await ctx.params;
  const db = requireDb();

  const [row] = await db
    .select()
    .from(generationJobs)
    .where(
      and(eq(generationJobs.id, id), eq(generationJobs.userId, session.user.id)),
    )
    .limit(1);

  if (!row) {
    return jsonError(404, { error: "Not found", code: "NOT_FOUND" });
  }

  const input = row.inputJson as GenerationJobInput | null;
  const output = row.outputJson as GenerationJobOutput | null;

  const base = {
    id: row.id,
    status: row.status,
    type: row.type,
    durationSec: input?.durationSec ?? null,
    bpm: input?.bpm ?? null,
    error: row.errorMessage ?? undefined,
  };

  if (row.status === "complete" && output?.audioUrl) {
    return NextResponse.json({
      ...base,
      audioUrl: output.audioUrl,
    });
  }

  return NextResponse.json(base);
}
