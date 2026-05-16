import { describe, expect, it } from "vitest";

import { codeChallengeS256, generateCodeVerifier, generateOAuthState } from "@/lib/publish/oauthPkce";

describe("oauthPkce", () => {
  it("generates verifier within RFC length bounds", () => {
    const v = generateCodeVerifier(64);
    expect(v.length).toBe(64);
    expect(/^[A-Za-z0-9\-._~]+$/.test(v)).toBe(true);
  });

  it("produces stable S256 challenge for same verifier", () => {
    const v = "012345678901234567890123456789012345678901234567890";
    expect(codeChallengeS256(v)).toBe(codeChallengeS256(v));
  });

  it("generates non-empty oauth state", () => {
    expect(generateOAuthState().length).toBeGreaterThan(10);
  });
});
