import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "@/lib/crypto/tokens";

describe("publish token crypto", () => {
  it("round-trips plaintext", () => {
    const plain = "refresh_token_example";
    const enc = encryptToken(plain);
    expect(enc.startsWith("v1.")).toBe(true);
    expect(decryptToken(enc)).toBe(plain);
  });

  it("rejects unknown ciphertext version", () => {
    expect(() => decryptToken("v0.foo")).toThrow();
  });
});
