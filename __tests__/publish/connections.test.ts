import { afterEach, describe, expect, it, vi } from "vitest";

import {
  refreshGoogleAccessToken,
  refreshSoundCloudAccessToken,
  revokeGoogleOAuthToken,
} from "@/lib/publish/oauthTokenRefresh";

describe("oauthTokenRefresh", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete process.env.SOUNDCLOUD_CLIENT_ID;
    delete process.env.SOUNDCLOUD_CLIENT_SECRET;
    delete process.env.YOUTUBE_OAUTH_CLIENT_ID;
    delete process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  });

  it("refreshSoundCloudAccessToken posts to SoundCloud token endpoint", async () => {
    process.env.SOUNDCLOUD_CLIENT_ID = "cid";
    process.env.SOUNDCLOUD_CLIENT_SECRET = "sec";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ access_token: "a", expires_in: 3600, refresh_token: "r" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tok = await refreshSoundCloudAccessToken("refresh-me");
    expect(tok.access_token).toBe("a");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://secure.soundcloud.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("refreshGoogleAccessToken posts to Google token endpoint", async () => {
    process.env.YOUTUBE_OAUTH_CLIENT_ID = "gid";
    process.env.YOUTUBE_OAUTH_CLIENT_SECRET = "gsec";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "ga", expires_in: 1800 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const tok = await refreshGoogleAccessToken("gr");
    expect(tok.access_token).toBe("ga");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("revokeGoogleOAuthToken calls revoke endpoint (best-effort)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await revokeGoogleOAuthToken("any-token");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/revoke",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
