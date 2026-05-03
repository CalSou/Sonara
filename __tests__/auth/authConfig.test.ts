import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveAuthSecret } from "@/auth.config";

describe("resolveAuthSecret", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns AUTH_SECRET when set", () => {
    process.env.AUTH_SECRET = "from-auth-secret";
    expect(resolveAuthSecret()).toBe("from-auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET", () => {
    process.env.NEXTAUTH_SECRET = "from-nextauth";
    expect(resolveAuthSecret()).toBe("from-nextauth");
  });

  it("allows missing secret during next build (NEXT_PHASE)", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PHASE = "phase-production-build";
    expect(resolveAuthSecret()).toMatch(/development-secret/);
  });

  it("allows missing secret during npm build lifecycle", () => {
    process.env.NODE_ENV = "production";
    process.env.npm_lifecycle_event = "build";
    expect(resolveAuthSecret()).toMatch(/development-secret/);
  });

  it("throws in production runtime when secret is missing", () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PHASE;
    delete process.env.npm_lifecycle_event;
    expect(() => resolveAuthSecret()).toThrow(/AUTH_SECRET/);
  });
});
