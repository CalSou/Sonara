import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const body = await req.json();
    const jobId = crypto.randomUUID();

    return NextResponse.json({
      job_id: jobId,
      status: "pending",
      message:
        "Mastering queued (stub). Implement server-side DSP / FFmpeg in Phase 5.",
      echo: body,
    });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
