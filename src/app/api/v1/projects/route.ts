import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getDb } from "@/db/index";
import { projects } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  bpm: z.number().int().min(40).max(220).optional().nullable(),
  state_json: z.record(z.string(), z.unknown()),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const db = getDb();
  if (!db) {
    return jsonError(503, {
      error: "Database not configured",
      code: "DB_UNAVAILABLE",
    });
  }
  const rows = await db.query.projects.findMany({
    where: (p, { eq }) => eq(p.userId, session.user.id),
    orderBy: [desc(projects.updatedAt)],
  });

  return NextResponse.json({ projects: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  try {
    const raw = await req.json();
    const parsed = upsertSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, {
        error: parsed.error.message,
        code: "VALIDATION_ERROR",
      });
    }

    const db = getDb();
    if (!db) {
      return jsonError(503, {
        error: "Database not configured",
        code: "DB_UNAVAILABLE",
      });
    }
    const now = new Date();

    if (parsed.data.id) {
      const updated = await db
        .update(projects)
        .set({
          name: parsed.data.name,
          bpm: parsed.data.bpm ?? null,
          stateJson: parsed.data.state_json,
          updatedAt: now,
        })
        .where(
          and(eq(projects.id, parsed.data.id), eq(projects.userId, session.user.id)),
        )
        .returning();

      if (updated.length === 0) {
        return jsonError(404, { error: "Project not found", code: "NOT_FOUND" });
      }

      return NextResponse.json({ project: updated[0] });
    }

    const [created] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        bpm: parsed.data.bpm ?? null,
        stateJson: parsed.data.state_json,
      })
      .returning();

    return NextResponse.json({ project: created });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
