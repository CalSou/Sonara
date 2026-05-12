import { describe, expect, it } from "vitest";

import { oauthStatesMatch } from "@/lib/publish/oauthState";

describe("oauthStatesMatch", () => {
  it("accepts matching states", () => {
    expect(oauthStatesMatch("abc", "abc")).toBe(true);
  });

  it("rejects mismatch", () => {
    expect(oauthStatesMatch("abc", "xyz")).toBe(false);
  });

  it("rejects missing cookie", () => {
    expect(oauthStatesMatch(undefined, "abc")).toBe(false);
  });

  it("rejects missing query", () => {
    expect(oauthStatesMatch("abc", null)).toBe(false);
  });
});
