import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";

/** Stub handler — verify Replicate webhook signatures in Phase 3. */
export async function POST(req: Request) {
  try {
    await req.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Webhook received (stub). Implement signature verification + job updates in Phase 3.",
  });
}
