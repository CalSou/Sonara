import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";
import { getDb } from "@/db/index";
import { listPublishConnections } from "@/lib/publish/connections";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ connections: {} });
  }

  const connections = await listPublishConnections(db, session.user.id);
  return NextResponse.json({ connections });
}
