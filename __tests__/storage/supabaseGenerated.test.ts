import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn();
const createSignedUrl = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload,
        createSignedUrl,
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://example.test/public.wav" },
        })),
      })),
    },
  })),
}));

import { uploadGeneratedWavToSupabase } from "@/lib/storage/supabaseGenerated";

describe("uploadGeneratedWavToSupabase", () => {
  beforeEach(() => {
    upload.mockResolvedValue({ error: null });
    createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.test/signed.wav" },
      error: null,
    });
    vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    vi.stubEnv("SUPABASE_STORAGE_BUCKET", "sonara-audio");
  });

  it("returns null when Supabase URL missing", async () => {
    vi.stubEnv("SUPABASE_URL", "");
    await expect(
      uploadGeneratedWavToSupabase({
        userId: "u1",
        jobId: "j1",
        bytes: Buffer.from("x"),
      }),
    ).resolves.toBeNull();
  });

  it("returns signed URL when upload succeeds", async () => {
    const url = await uploadGeneratedWavToSupabase({
      userId: "u1",
      jobId: "j1",
      bytes: Buffer.from("fake"),
    });
    expect(url).toBe("https://example.test/signed.wav");
    expect(upload).toHaveBeenCalled();
  });

  it("falls back to public URL when signed URL unavailable", async () => {
    createSignedUrl.mockResolvedValueOnce({ data: null, error: { message: "no" } });
    const url = await uploadGeneratedWavToSupabase({
      userId: "u1",
      jobId: "j1",
      bytes: Buffer.from("fake"),
    });
    expect(url).toBe("https://example.test/public.wav");
  });

  it("throws when upload errors", async () => {
    upload.mockResolvedValueOnce({ error: { message: "quota" } });
    await expect(
      uploadGeneratedWavToSupabase({
        userId: "u1",
        jobId: "j1",
        bytes: Buffer.from("fake"),
      }),
    ).rejects.toThrow(/quota/);
  });
});
