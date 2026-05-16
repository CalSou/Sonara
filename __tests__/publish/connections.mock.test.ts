import { describe, expect, it, afterEach } from "vitest";

import { withFreshAccessToken } from "@/lib/publish/connections";

describe("withFreshAccessToken mock mode", () => {
  afterEach(() => {
    delete process.env.PUBLISH_MOCK_PROVIDERS;
    delete process.env.PUBLISH_MOCK_ACCESS_TOKEN;
  });

  it("returns mock token without touching db", async () => {
    process.env.PUBLISH_MOCK_PROVIDERS = "true";
    process.env.PUBLISH_MOCK_ACCESS_TOKEN = "fixed-test-token";
    const out = await withFreshAccessToken(
      {} as never,
      "user-1",
      "youtube",
      async (t) => t,
    );
    expect(out).toBe("fixed-test-token");
  });
});
