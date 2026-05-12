import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";

/**
 * Proxies multipart upload to SoundCloud's POST /tracks endpoint.
 * Client sends same FormData fields as our UI builds; `file` is mapped to `track[asset_data]`.
 *
 * Enable only when you accept the security tradeoff (browser sends OAuth token).
 * Set PUBLISH_PROXY_ENABLED=true in .env.local for development.
 *
 * @see https://developers.soundcloud.com/docs/api/guide
 */
export async function POST(req: Request) {
  if (process.env.PUBLISH_PROXY_ENABLED !== "true") {
    return jsonError(503, {
      error:
        "SoundCloud publish proxy disabled. Set PUBLISH_PROXY_ENABLED=true in .env.local after reading docs/publishing-third-party.md.",
      code: "PUBLISH_DISABLED",
    });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("OAuth ")) {
    return jsonError(401, {
      error: "Missing Authorization: OAuth <access_token> header",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const incoming = await req.formData();
    const outgoing = new FormData();

    for (const [key, value] of incoming.entries()) {
      if (key === "file" && value instanceof File) {
        const blob = value;
        outgoing.append(
          "track[asset_data]",
          blob,
          blob.name || "sonara.wav",
        );
      } else {
        outgoing.append(key, value);
      }
    }

    const scRes = await fetch("https://api.soundcloud.com/tracks", {
      method: "POST",
      headers: {
        Authorization: auth,
      },
      body: outgoing,
    });

    const body = await scRes.json().catch(() => ({}));

    if (!scRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof body === "object" && body && "errors" in body
              ? JSON.stringify(body)
              : `SoundCloud API ${scRes.status}`,
          code: "SOUNDCLOUD_ERROR",
        },
        { status: scRes.status >= 400 ? scRes.status : 502 },
      );
    }

    return NextResponse.json(body);
  } catch {
    return jsonError(400, { error: "Invalid multipart body", code: "BAD_REQUEST" });
  }
}
