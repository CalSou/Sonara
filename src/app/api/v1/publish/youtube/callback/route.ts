import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { requireDb } from "@/db/index";
import { oauthCookieOptions, publishCookies } from "@/lib/publish/cookieNames";
import { getAppOrigin, youtubeRedirectUri } from "@/lib/publish/appOrigin";
import { upsertPublishConnection } from "@/lib/publish/connections";
import { oauthStatesMatch } from "@/lib/publish/oauthState";

export const runtime = "nodejs";

function decodeJwtSub(idToken: string): string {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("bad id_token");
  const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as {
    sub?: string;
  };
  if (!payload.sub) throw new Error("missing sub");
  return payload.sub;
}

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

  const expected = req.cookies.get(publishCookies.ytState)?.value;
  if (!oauthStatesMatch(expected, state)) {
    return NextResponse.redirect(new URL("/studio?publish_error=invalid_state", origin));
  }

  const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/studio?publish_error=config", origin));
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: youtubeRedirectUri(),
    grant_type: "authorization_code",
  });

  const tokRes = await fetch("https://oauth2.googleapis.com/token", {
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
    id_token?: string;
  };

  let providerAccountId: string;
  if (tok.id_token) {
    try {
      providerAccountId = decodeJwtSub(tok.id_token);
    } catch {
      providerAccountId = "";
    }
  } else {
    providerAccountId = "";
  }
  if (!providerAccountId) {
    const infoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(tok.access_token)}`,
    );
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { user_id?: string; sub?: string };
      providerAccountId = info.user_id ?? info.sub ?? session.user.id;
    } else {
      providerAccountId = session.user.id;
    }
  }

  const db = requireDb();
  await upsertPublishConnection(db, {
    userId: session.user.id,
    provider: "youtube",
    providerAccountId,
    accessToken: tok.access_token,
    accessTokenExpires: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000),
    refreshToken: tok.refresh_token ?? null,
    scope: tok.scope ?? null,
  });

  const res = NextResponse.redirect(new URL("/studio?publish_connected=youtube", origin));
  res.cookies.set(publishCookies.ytState, "", { ...oauthCookieOptions(), maxAge: 0 });
  return res;
}
