import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getPublicWebhookBaseUrl,
  resolveEffectiveAiGenerationBackend,
} from "@/lib/ai/server/factory";

const env = process.env as Record<string, string | undefined>;

describe("resolveEffectiveAiGenerationBackend", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ["AI_PROVIDER", "REPLICATE_API_TOKEN", "DATABASE_URL"]) {
      saved[k] = env[k];
      delete env[k];
    }
  });

  afterEach(() => {
    for (const k of ["AI_PROVIDER", "REPLICATE_API_TOKEN", "DATABASE_URL"]) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
  });

  it("returns mock when AI_PROVIDER unset", () => {
    expect(resolveEffectiveAiGenerationBackend()).toBe("mock");
  });

  it("returns mock when replicate but token missing", () => {
    env.AI_PROVIDER = "replicate";
    env.DATABASE_URL = "postgresql://x";
    expect(resolveEffectiveAiGenerationBackend()).toBe("mock");
  });

  it("returns mock when replicate but DATABASE_URL missing", () => {
    env.AI_PROVIDER = "replicate";
    env.REPLICATE_API_TOKEN = "t";
    expect(resolveEffectiveAiGenerationBackend()).toBe("mock");
  });

  it("returns replicate when all required env present", () => {
    env.AI_PROVIDER = "replicate";
    env.REPLICATE_API_TOKEN = "t";
    env.DATABASE_URL = "postgresql://x";
    expect(resolveEffectiveAiGenerationBackend()).toBe("replicate");
  });

  it("treats AI_PROVIDER mock explicitly", () => {
    env.AI_PROVIDER = "mock";
    env.REPLICATE_API_TOKEN = "t";
    env.DATABASE_URL = "postgresql://x";
    expect(resolveEffectiveAiGenerationBackend()).toBe("mock");
  });
});

describe("getPublicWebhookBaseUrl", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ["REPLICATE_WEBHOOK_PUBLIC_BASE_URL", "NEXTAUTH_URL"]) {
      saved[k] = env[k];
      delete env[k];
    }
  });

  afterEach(() => {
    for (const k of ["REPLICATE_WEBHOOK_PUBLIC_BASE_URL", "NEXTAUTH_URL"]) {
      if (saved[k] === undefined) delete env[k];
      else env[k] = saved[k];
    }
  });

  it("prefers REPLICATE_WEBHOOK_PUBLIC_BASE_URL and strips trailing slash", () => {
    env.REPLICATE_WEBHOOK_PUBLIC_BASE_URL = "https://tunnel.example/";
    expect(getPublicWebhookBaseUrl()).toBe("https://tunnel.example");
  });

  it("falls back to NEXTAUTH_URL", () => {
    env.NEXTAUTH_URL = "http://localhost:3000/";
    expect(getPublicWebhookBaseUrl()).toBe("http://localhost:3000");
  });
});
