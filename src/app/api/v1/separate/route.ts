import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const body = (await req.json()) as { audioUrl?: string; model?: string };
    const jobId = crypto.randomUUID();

    return NextResponse.json({
      job_id: jobId,
      status: "pending",
      message:
        "Separation queued (stub). Implement Demucs/Replicate + persistence in Phase 3.",
      echo: body,
    });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
