import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseDailySecondsLimit, sumGenerationSecondsToday } from "@/lib/ai/server/dailyGenerationBudget";

const env = process.env as Record<string, string | undefined>;

describe("parseDailySecondsLimit", () => {
  let saved: string | undefined;

  beforeEach(() => {
    saved = env.AI_GENERATE_DAILY_SECONDS_LIMIT;
    delete env.AI_GENERATE_DAILY_SECONDS_LIMIT;
  });

  afterEach(() => {
    if (saved === undefined) delete env.AI_GENERATE_DAILY_SECONDS_LIMIT;
    else env.AI_GENERATE_DAILY_SECONDS_LIMIT = saved;
  });

  it("defaults to 600", () => {
    expect(parseDailySecondsLimit()).toBe(600);
  });

  it("parses integer env", () => {
    env.AI_GENERATE_DAILY_SECONDS_LIMIT = "1200";
    expect(parseDailySecondsLimit()).toBe(1200);
  });

  it("falls back on invalid", () => {
    env.AI_GENERATE_DAILY_SECONDS_LIMIT = "nope";
    expect(parseDailySecondsLimit()).toBe(600);
  });
});

describe("sumGenerationSecondsToday", () => {
  it("returns numeric total from select row", async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 125.5 }]),
        }),
      }),
    };
    const n = await sumGenerationSecondsToday(db as never, "user-1");
    expect(n).toBe(125.5);
    expect(db.select).toHaveBeenCalled();
  });

  it("returns 0 when row missing total", async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{}]),
        }),
      }),
    };
    const n = await sumGenerationSecondsToday(db as never, "user-1");
    expect(n).toBe(0);
  });
});
