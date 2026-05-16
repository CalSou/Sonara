import { describe, expect, it, afterEach } from "vitest";

import { oauthCookieOptions } from "@/lib/publish/cookieNames";

describe("oauthCookieOptions", () => {
  const env = process.env as Record<string, string | undefined>;

  afterEach(() => {
    env.NODE_ENV = "test";
  });

  it("sets Secure in production", () => {
    env.NODE_ENV = "production";
    expect(oauthCookieOptions().secure).toBe(true);
  });

  it("disables Secure outside production", () => {
    env.NODE_ENV = "development";
    expect(oauthCookieOptions().secure).toBe(false);
  });
});
