import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";
import { requireDb } from "@/db/index";
import { genreLabel } from "@/lib/music/genres";
import { withFreshAccessToken } from "@/lib/publish/connections";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch {
    return jsonError(400, { error: "Expected multipart form data", code: "BAD_REQUEST" });
  }

  const file = incoming.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return jsonError(400, { error: "Missing file", code: "BAD_REQUEST" });
  }

  const title = String(incoming.get("title") ?? "Sonara upload").slice(0, 500);
  const description = String(incoming.get("description") ?? "").slice(0, 4000);
  const genreIdRaw = String(incoming.get("genreId") ?? "").trim();
  const tagListRaw = String(incoming.get("tag_list") ?? "").slice(0, 500);
  const genrePrefix = genreIdRaw ? genreLabel(genreIdRaw) : "";
  const mergedTags = [genrePrefix, tagListRaw].filter(Boolean).join(", ").slice(0, 500);
  const sharingRaw = String(incoming.get("sharing") ?? "private").toLowerCase();
  const sharing = sharingRaw === "public" ? "public" : "private";

  const db = requireDb();

  try {
    return await withFreshAccessToken(db, session.user.id, "soundcloud", async (token) => {
      const outgoing = new FormData();
      outgoing.append("track[title]", title);
      if (description) outgoing.append("track[description]", description);
      outgoing.append("track[sharing]", sharing);
      if (mergedTags) outgoing.append("track[tag_list]", mergedTags);
      outgoing.append("track[asset_data]", file, file.name || "upload.wav");

      const scRes = await fetch("https://api.soundcloud.com/tracks", {
        method: "POST",
        headers: {
          Authorization: `OAuth ${token}`,
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
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NOT_CONNECTED") {
      return jsonError(401, { error: "Connect SoundCloud first", code: "NOT_CONNECTED" });
    }
    return jsonError(502, { error: msg, code: "TOKEN_ERROR" });
  }
}
