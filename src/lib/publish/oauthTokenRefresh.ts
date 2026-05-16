/**
 * OAuth token refresh HTTP calls (extracted for unit tests and reuse).
 */

export type OAuthTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
};

export async function refreshSoundCloudAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SOUNDCLOUD_CLIENT_ID/SECRET not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`SoundCloud token refresh failed: ${await res.text()}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("YOUTUBE_OAUTH_CLIENT_ID/SECRET not configured");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${await res.text()}`);
  }
  return res.json() as Promise<OAuthTokenResponse>;
}

/** Best-effort Google OAuth token revocation (accepts access or refresh token). */
export async function revokeGoogleOAuthToken(token: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    /* ignore network errors */
  }
}
