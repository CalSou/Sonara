import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import { getDb } from "@/db/index";
import { users } from "@/db/schema";
import { jsonError } from "@/lib/api/errors";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const parsed = schema.safeParse(raw);
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
    const exists = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, parsed.data.email),
    });
    if (exists) {
      return jsonError(409, { error: "Email already registered", code: "CONFLICT" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [created] = await db
      .insert(users)
      .values({
        email: parsed.data.email,
        name: parsed.data.name ?? parsed.data.email.split("@")[0],
        passwordHash,
      })
      .returning({ id: users.id });

    return NextResponse.json({ id: created.id, email: parsed.data.email });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
