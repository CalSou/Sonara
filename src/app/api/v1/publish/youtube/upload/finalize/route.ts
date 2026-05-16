import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Client completes resumable PUT to Google directly; optional finalize to echo parsed resource.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    /* empty body ok */
  }

  const resource =
    body &&
    typeof body === "object" &&
    body !== null &&
    "resource" in body &&
    (body as { resource?: unknown }).resource !== undefined
      ? (body as { resource?: unknown }).resource
      : null;

  return NextResponse.json({ ok: true, resource });
}
