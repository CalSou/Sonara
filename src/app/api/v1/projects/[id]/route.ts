import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { projects } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const { id } = await ctx.params;
  const db = requireDb();

  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, session.user.id)))
    .returning({ id: projects.id });

  if (deleted.length === 0) {
    return jsonError(404, { error: "Project not found", code: "NOT_FOUND" });
  }

  return NextResponse.json({ ok: true });
}
