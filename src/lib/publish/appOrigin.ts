/** Canonical app origin for OAuth redirects (no trailing slash). */
export function getAppOrigin(): string {
  const u = process.env.NEXTAUTH_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function soundCloudRedirectUri(): string {
  return (
    process.env.SOUNDCLOUD_REDIRECT_URI?.trim() ??
    `${getAppOrigin()}/api/v1/publish/soundcloud/callback`
  );
}

export function youtubeRedirectUri(): string {
  return (
    process.env.YOUTUBE_OAUTH_REDIRECT_URI?.trim() ??
    `${getAppOrigin()}/api/v1/publish/youtube/callback`
  );
}
