import { describe, expect, it } from "vitest";

import { oauthCallbackHasAuthorizationParams } from "@/lib/publish/oauthCallback";
import { oauthStatesMatch } from "@/lib/publish/oauthState";

describe("OAuth callback query params", () => {
  it("requires code and state", () => {
    expect(oauthCallbackHasAuthorizationParams("abc", "def")).toBe(true);
    expect(oauthCallbackHasAuthorizationParams(null, "def")).toBe(false);
    expect(oauthCallbackHasAuthorizationParams("abc", "")).toBe(false);
  });
});

describe("OAuth CSRF state cookie vs query", () => {
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
