import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { disconnectPublishProviderBestEffort } from "@/lib/publish/connections";
import { assertPublishCryptoProduction } from "@/lib/publish/publishEnv";

export const runtime = "nodejs";

export async function POST() {
  assertPublishCryptoProduction();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }
  const db = requireDb();
  await disconnectPublishProviderBestEffort(db, session.user.id, "youtube");
  return NextResponse.json({ ok: true });
}
