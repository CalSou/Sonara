import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveAuthSecret } from "@/auth.config";

/** Writable handle so we can safely mutate process.env entries in tests. */
const env = process.env as Record<string, string | undefined>;

describe("resolveAuthSecret", () => {
  const saved: Record<string, string | undefined> = {};
  const keys = ["AUTH_SECRET", "NEXTAUTH_SECRET", "NODE_ENV", "NEXT_PHASE", "npm_lifecycle_event"];

  beforeEach(() => {
    vi.resetModules();
    for (const k of keys) saved[k] = env[k];
    delete env.AUTH_SECRET;
    delete env.NEXTAUTH_SECRET;
  });

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
  });

  it("returns AUTH_SECRET when set", () => {
    env.AUTH_SECRET = "from-auth-secret";
    expect(resolveAuthSecret()).toBe("from-auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET", () => {
    env.NEXTAUTH_SECRET = "from-nextauth";
    expect(resolveAuthSecret()).toBe("from-nextauth");
  });

  it("allows missing secret during next build (NEXT_PHASE)", () => {
    env.NODE_ENV = "production";
    env.NEXT_PHASE = "phase-production-build";
    expect(resolveAuthSecret()).toMatch(/development-secret/);
  });

  it("allows missing secret during npm build lifecycle", () => {
    env.NODE_ENV = "production";
    delete env.NEXT_PHASE;
    env.npm_lifecycle_event = "build";
    expect(resolveAuthSecret()).toMatch(/development-secret/);
  });

  it("throws in production runtime when secret is missing", () => {
    env.NODE_ENV = "production";
    delete env.NEXT_PHASE;
    delete env.npm_lifecycle_event;
    expect(() => resolveAuthSecret()).toThrow(/AUTH_SECRET/);
  });
});
