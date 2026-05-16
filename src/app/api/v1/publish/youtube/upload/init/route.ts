import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";
import { requireDb } from "@/db/index";
import { withFreshAccessToken } from "@/lib/publish/connections";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(5000).optional().default(""),
  privacyStatus: z.enum(["private", "public", "unlisted"]).default("private"),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(3).max(120),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError(400, { error: "Invalid JSON", code: "BAD_JSON" });
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return jsonError(400, { error: parsed.error.message, code: "VALIDATION_ERROR" });
  }

  if (!parsed.data.mimeType.startsWith("video/")) {
    return jsonError(415, {
      error: "YouTube upload expects a video MIME type (e.g. video/mp4).",
      code: "UNSUPPORTED_MEDIA",
    });
  }

  const db = requireDb();
  const { title, description, privacyStatus, fileSize, mimeType } = parsed.data;

  try {
    return await withFreshAccessToken(db, session.user.id, "youtube", async (token) => {
      const initRes = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Length": String(fileSize),
            "X-Upload-Content-Type": mimeType,
          },
          body: JSON.stringify({
            snippet: { title, description, categoryId: "10" },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
            },
          }),
        },
      );

      const uploadUrl = initRes.headers.get("Location");
      if (!uploadUrl) {
        const text = await initRes.text();
        return jsonError(initRes.status >= 400 ? initRes.status : 502, {
          error: text.slice(0, 800),
          code: "YOUTUBE_INIT_FAILED",
        });
      }

      return NextResponse.json({ uploadUrl });
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "NOT_CONNECTED") {
      return jsonError(401, { error: "Connect YouTube first", code: "NOT_CONNECTED" });
    }
    return jsonError(502, { error: msg, code: "TOKEN_ERROR" });
  }
}
