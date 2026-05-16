import { describe, expect, it } from "vitest";

import { jsonError } from "@/lib/api/errors";

describe("jsonError", () => {
  it("returns JSON Response", async () => {
    const res = jsonError(400, { error: "bad", code: "BAD" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("bad");
  });
});
