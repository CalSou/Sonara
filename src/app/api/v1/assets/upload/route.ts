import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { jsonError } from "@/lib/api/errors";

const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(["audio/wav", "audio/mpeg", "audio/ogg"]),
  byteLength: z.number().int().min(1).max(50 * 1024 * 1024),
});

const AUDIO_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "sonara-audio";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonError(401, { error: "Unauthorized", code: "UNAUTHORIZED" });
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return jsonError(503, {
      error: "Storage not configured",
      code: "STORAGE_UNAVAILABLE",
    });
  }

  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, {
        error: parsed.error.message,
        code: "VALIDATION_ERROR",
      });
    }

    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const assetId = crypto.randomUUID();
    const ext =
      parsed.data.contentType === "audio/wav"
        ? ".wav"
        : parsed.data.contentType === "audio/mpeg"
          ? ".mp3"
          : ".ogg";
    const path = `audio/${session.user.id}/${assetId}${ext}`;

    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return jsonError(500, {
        error: error?.message ?? "Failed to create upload URL",
        code: "STORAGE_ERROR",
      });
    }

    const signed = data as {
      signedUrl: string;
      token: string;
      expiresIn?: number | null;
    };

    return NextResponse.json({
      asset_id: assetId,
      bucket: AUDIO_BUCKET,
      path,
      signedUrl: signed.signedUrl,
      token: signed.token,
      expiresIn: signed.expiresIn ?? null,
      headers: {
        "Content-Type": parsed.data.contentType,
        "Content-Length": String(parsed.data.byteLength),
      },
    });
  } catch {
    return jsonError(400, { error: "Invalid JSON body", code: "BAD_JSON" });
  }
}
