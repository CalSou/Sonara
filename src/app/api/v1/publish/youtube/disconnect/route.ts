import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { revokePublishConnection } from "@/lib/publish/connections";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const db = requireDb();
  await revokePublishConnection(db, session.user.id, "youtube");
  return NextResponse.json({ ok: true });
}
