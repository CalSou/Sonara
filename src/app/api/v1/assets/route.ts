import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { audioAssets } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const db = requireDb();
  const rows = await db.query.audioAssets.findMany({
    where: (a, { eq }) => eq(a.userId, session.user.id),
    orderBy: [desc(audioAssets.createdAt)],
    limit: 100,
  });

  return NextResponse.json({ assets: rows });
}
