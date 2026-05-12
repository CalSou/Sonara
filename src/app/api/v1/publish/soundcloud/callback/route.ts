import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { oauthCookieOptions, publishCookies } from "@/lib/publish/cookieNames";
import { getAppOrigin, soundCloudRedirectUri } from "@/lib/publish/appOrigin";
import { upsertPublishConnection } from "@/lib/publish/connections";
import { oauthStatesMatch } from "@/lib/publish/oauthState";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = getAppOrigin();
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/guest-login?next=/studio", origin));
  }

  const sp = req.nextUrl.searchParams;
  const oerr = sp.get("error");
  if (oerr) {
    return NextResponse.redirect(
      new URL(`/studio?publish_error=${encodeURIComponent(oerr)}`, origin),
    );
  }

  const code = sp.get("code");
  const state = sp.get("state");
  if (!code || !state) {
    return NextResponse.redirect(new URL("/studio?publish_error=missing_code", origin));
  }

  const jar = req.cookies;
  const expectedState = jar.get(publishCookies.scState)?.value;
  const verifier = jar.get(publishCookies.scVerifier)?.value;
  if (!oauthStatesMatch(expectedState, state) || !verifier) {
    return NextResponse.redirect(new URL("/studio?publish_error=invalid_state", origin));
  }

  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/studio?publish_error=config", origin));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: soundCloudRedirectUri(),
    code,
    code_verifier: verifier,
  });

  const tokRes = await fetch("https://secure.soundcloud.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokRes.ok) {
    const t = await tokRes.text();
    return NextResponse.redirect(
      new URL(`/studio?publish_error=${encodeURIComponent(t.slice(0, 200))}`, origin),
    );
  }
  const tok = (await tokRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };

  const access = tok.access_token;
  const meRes = await fetch("https://api.soundcloud.com/me", {
    headers: { Authorization: `OAuth ${access}` },
  });
  if (!meRes.ok) {
    return NextResponse.redirect(new URL("/studio?publish_error=me_failed", origin));
  }
  const me = (await meRes.json()) as { id: number };
  const providerAccountId = String(me.id);

  const db = requireDb();
  await upsertPublishConnection(db, {
    userId: session.user.id,
    provider: "soundcloud",
    providerAccountId,
    accessToken: access,
    accessTokenExpires: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000),
    refreshToken: tok.refresh_token ?? null,
    scope: tok.scope ?? null,
  });

  const res = NextResponse.redirect(new URL("/studio?publish_connected=soundcloud", origin));
  const opts = { ...oauthCookieOptions(), maxAge: 0 };
  res.cookies.set(publishCookies.scState, "", opts);
  res.cookies.set(publishCookies.scVerifier, "", opts);
  return res;
}
