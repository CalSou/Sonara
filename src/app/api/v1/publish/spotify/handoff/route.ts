import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";
import { requireDb } from "@/db/index";
import { releaseDrafts } from "@/db/schema";
import { distributorById } from "@/lib/publish/distributors";
import { parseReleaseMetadata } from "@/lib/publish/release";

export const runtime = "nodejs";

const bodySchema = z.object({
  metadata: z.any(),
  distributorId: z.enum(["distrokid", "tunecore", "amuse", "cdbaby"]),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON", code: "BAD_JSON" });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, { error: parsed.error.message, code: "VALIDATION_ERROR" });
  }

  const metaParse = parseReleaseMetadata(parsed.data.metadata);
  if (!metaParse.success) {
    return jsonError(400, { error: metaParse.error.message, code: "VALIDATION_ERROR" });
  }

  const dist = distributorById(parsed.data.distributorId);
  if (!dist) {
    return jsonError(400, { error: "Unknown distributor", code: "BAD_DISTRIBUTOR" });
  }

  const db = requireDb();
  const inserted = await db
    .insert(releaseDrafts)
    .values({
      userId: session.user.id,
      metadataJson: metaParse.data,
      distributor: dist.id,
      status: "linked_out",
    })
    .returning({ id: releaseDrafts.id });

  const row = inserted[0];
  if (!row) {
    return jsonError(500, { error: "Failed to persist draft", code: "DB_ERROR" });
  }

  return NextResponse.json({
    draftId: row.id,
    distributorUrl: dist.signupUrl,
    distributorLabel: dist.label,
    message:
      "Sonara cannot upload directly to Spotify. Open your distributor and create a release using the exported 24-bit WAV and metadata you entered.",
  });
}
