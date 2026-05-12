import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/errors";

export const runtime = "nodejs";

/**
 * Proxies YouTube Data API v3 **resumable** upload (videos.insert).
 * Expects multipart FormData: `file` (video), `title`, optional `description`.
 * Client sends `Authorization: Bearer <google_access_token>` with youtube.upload scope.
 *
 * MVP: **video files only** (e.g. MP4). YouTube does not accept raw WAV/MP3 through
 * videos.insert; mux audio + still image offline, then upload here.
 *
 * Enable with YOUTUBE_PUBLISH_PROXY_ENABLED=true
 *
 * @see https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
 */
export async function POST(req: Request) {
  if (process.env.YOUTUBE_PUBLISH_PROXY_ENABLED !== "true") {
    return jsonError(503, {
      error:
        "YouTube publish proxy disabled. Set YOUTUBE_PUBLISH_PROXY_ENABLED=true in .env.local (see docs/publishing-third-party.md).",
      code: "PUBLISH_DISABLED",
    });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return jsonError(401, {
      error: "Missing Authorization: Bearer <google_access_token> header",
      code: "UNAUTHORIZED",
    });
  }

  try {
    const incoming = await req.formData();
    const file = incoming.get("file");
    const title = String(incoming.get("title") ?? "Sonara upload").slice(0, 100);
    const description = String(incoming.get("description") ?? "").slice(0, 5000);

    if (!(file instanceof File)) {
      return jsonError(400, { error: "Missing file field", code: "BAD_REQUEST" });
    }

    const mime = file.type || "application/octet-stream";
    if (!mime.startsWith("video/")) {
      return jsonError(415, {
        error:
          "YouTube MVP upload expects a video container (e.g. MP4). Mux your audio with artwork or video in an editor, then choose that file. SoundCloud accepts common audio formats directly.",
        code: "UNSUPPORTED_MEDIA",
      });
    }

    const bytes = await file.arrayBuffer();
    const size = bytes.byteLength;
    if (size < 1) {
      return jsonError(400, { error: "Empty file", code: "BAD_REQUEST" });
    }

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(size),
          "X-Upload-Content-Type": mime,
        },
        body: JSON.stringify({
          snippet: { title, description, categoryId: "10" },
          status: {
            privacyStatus: "private",
            selfDeclaredMadeForKids: false,
          },
        }),
      },
    );

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      const text = await initRes.text();
      return jsonError(initRes.status >= 400 ? initRes.status : 502, {
        error: text.slice(0, 800) || "Failed to start YouTube resumable session",
        code: "YOUTUBE_INIT_FAILED",
      });
    }

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mime,
        "Content-Length": String(size),
      },
      body: bytes,
    });

    const result = await putRes.json().catch(() => ({}));

    if (!putRes.ok) {
      return NextResponse.json(
        {
          error:
            typeof result === "object" &&
            result &&
            "error" in result &&
            typeof (result as { error?: { message?: string } }).error?.message === "string"
              ? (result as { error: { message: string } }).error.message
              : `YouTube upload failed (${putRes.status})`,
          code: "YOUTUBE_UPLOAD_FAILED",
        },
        { status: putRes.status >= 400 ? putRes.status : 502 },
      );
    }

    return NextResponse.json(result);
  } catch {
    return jsonError(400, { error: "Invalid multipart body", code: "BAD_REQUEST" });
  }
}
