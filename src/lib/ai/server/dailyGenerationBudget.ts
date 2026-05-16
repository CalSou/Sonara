import { and, eq, gte, sql } from "drizzle-orm";

import type { getDb } from "@/db/index";
import { generationJobs } from "@/db/schema";

type Db = NonNullable<ReturnType<typeof getDb>>;

/** UTC midnight today — sum all `generate` jobs created since then (includes pending/failed for quota fairness). */
export async function sumGenerationSecondsToday(db: Db, userId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum((${generationJobs.inputJson}->>'durationSec')::double precision), 0)`.mapWith(
        Number,
      ),
    })
    .from(generationJobs)
    .where(
      and(
        eq(generationJobs.userId, userId),
        eq(generationJobs.type, "generate"),
        gte(generationJobs.createdAt, start),
      ),
    );

  const n = row?.total ?? 0;
  return Number.isFinite(n) ? n : 0;
}

export function parseDailySecondsLimit(): number {
  const raw = process.env.AI_GENERATE_DAILY_SECONDS_LIMIT?.trim();
  if (!raw) return 600;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 600;
  return Math.floor(n);
}
