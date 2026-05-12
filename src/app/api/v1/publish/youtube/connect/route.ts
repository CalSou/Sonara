import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/db/index";
import { hasPublishTokenKey } from "@/lib/crypto/tokens";
import { oauthCookieOptions, publishCookies } from "@/lib/publish/cookieNames";
import { getAppOrigin, youtubeRedirectUri } from "@/lib/publish/appOrigin";
import { generateOAuthState } from "@/lib/publish/oauthPkce";

export const runtime = "nodejs";

const YT_SCOPE = "https://www.googleapis.com/auth/youtube.upload";

export async function GET() {
  const session = await auth();
  const origin = getAppOrigin();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/guest-login?next=/studio", origin));
  }

  if (!hasPublishTokenKey()) {
    return NextResponse.json(
      { error: "PUBLISH_TOKEN_KEY not configured", code: "CONFIG" },
      { status: 503 },
    );
  }

  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "YOUTUBE_OAUTH_CLIENT_ID not configured", code: "CONFIG" },
      { status: 503 },
    );
  }

  const state = generateOAuthState();
  const redirectUri = encodeURIComponent(youtubeRedirectUri());
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(YT_SCOPE)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(url);
  res.cookies.set(publishCookies.ytState, state, oauthCookieOptions());
  return res;
}
