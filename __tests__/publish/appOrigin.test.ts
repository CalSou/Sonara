import { describe, expect, it, beforeEach, afterEach } from "vitest";

import { getAppOrigin, soundCloudRedirectUri, youtubeRedirectUri } from "@/lib/publish/appOrigin";

describe("appOrigin", () => {
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    delete env.NEXTAUTH_URL;
    delete env.VERCEL_URL;
  });

  afterEach(() => {
    delete env.NEXTAUTH_URL;
    delete env.VERCEL_URL;
  });

  it("strips trailing slash from NEXTAUTH_URL", () => {
    env.NEXTAUTH_URL = "https://app.example.com/";
    expect(getAppOrigin()).toBe("https://app.example.com");
  });

  it("falls back to VERCEL_URL", () => {
    env.VERCEL_URL = "my.vercel.app";
    expect(getAppOrigin()).toBe("https://my.vercel.app");
  });

  it("defaults to localhost", () => {
    expect(getAppOrigin()).toBe("http://localhost:3000");
  });

  it("builds default OAuth redirect URIs", () => {
    env.NEXTAUTH_URL = "http://localhost:3000";
    expect(soundCloudRedirectUri()).toContain("/api/v1/publish/soundcloud/callback");
    expect(youtubeRedirectUri()).toContain("/api/v1/publish/youtube/callback");
  });
});
