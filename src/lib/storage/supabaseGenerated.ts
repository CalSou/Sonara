import { createClient } from "@supabase/supabase-js";

/**
 * Upload generated WAV bytes to Supabase Storage under `generated/{userId}/{jobId}.wav`.
 * Returns a signed URL (7-day) when possible, otherwise the bucket public URL.
 */
export async function uploadGeneratedWavToSupabase(params: {
  userId: string;
  jobId: string;
  bytes: Buffer;
}): Promise<string | null> {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? "sonara-audio";
  if (!url || !key) return null;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const path = `generated/${params.userId}/${params.jobId}.wav`;
  const { error: upErr } = await supabase.storage.from(bucket).upload(path, params.bytes, {
    contentType: "audio/wav",
    upsert: true,
  });
  if (upErr) throw new Error(upErr.message);

  const { data: signed, error: signErr } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 604800);
  if (!signErr && signed?.signedUrl) return signed.signedUrl;

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
  return pub.publicUrl;
}
