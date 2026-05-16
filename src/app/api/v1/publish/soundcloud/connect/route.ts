import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { hasPublishTokenKey } from "@/lib/crypto/tokens";
import { getAppOrigin, soundCloudRedirectUri } from "@/lib/publish/appOrigin";
import { oauthCookieOptions, publishCookies } from "@/lib/publish/cookieNames";
import {
  codeChallengeS256,
  generateCodeVerifier,
  generateOAuthState,
} from "@/lib/publish/oauthPkce";
import { assertPublishCryptoProduction } from "@/lib/publish/publishEnv";

export const runtime = "nodejs";

export async function GET() {
  assertPublishCryptoProduction();
  const session = await auth();
  const origin = getAppOrigin();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL(`/guest-login?next=/studio`, origin));
  }

  if (!hasPublishTokenKey()) {
    return NextResponse.json(
      { error: "PUBLISH_TOKEN_KEY not configured", code: "CONFIG" },
      { status: 503 },
    );
  }

  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "SOUNDCLOUD_CLIENT_ID not configured", code: "CONFIG" },
      { status: 503 },
    );
  }

  const state = generateOAuthState();
  const verifier = generateCodeVerifier();
  const challenge = codeChallengeS256(verifier);

  const redirectUri = encodeURIComponent(soundCloudRedirectUri());
  const url =
    `https://secure.soundcloud.com/authorize?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code` +
    `&code_challenge=${encodeURIComponent(challenge)}` +
    `&code_challenge_method=S256` +
    `&state=${encodeURIComponent(state)}`;

  const res = NextResponse.redirect(url);
  const opts = oauthCookieOptions();
  res.cookies.set(publishCookies.scState, state, opts);
  res.cookies.set(publishCookies.scVerifier, verifier, opts);
  return res;
}
