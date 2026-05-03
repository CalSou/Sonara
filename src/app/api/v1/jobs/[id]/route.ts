import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const { id } = await ctx.params;

  return NextResponse.json({
    id,
    status: "pending",
    message:
      "Job polling stub. Persist jobs in `generation_jobs` and hydrate from DB in Phase 3.",
  });
}
