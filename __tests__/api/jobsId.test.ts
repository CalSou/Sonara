import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  selectLimit: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/db/index", () => ({
  requireDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: mocks.selectLimit,
        }),
      }),
    }),
  }),
}));

import { GET } from "@/app/api/v1/jobs/[id]/route";

describe("GET /api/v1/jobs/[id]", () => {
  beforeEach(() => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  });

  const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await GET(new Request("http://localhost"), ctx("j1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when job missing", async () => {
    mocks.selectLimit.mockResolvedValueOnce([]);
    const res = await GET(new Request("http://localhost"), ctx("missing"));
    expect(res.status).toBe(404);
  });

  it("returns audioUrl when complete", async () => {
    mocks.selectLimit.mockResolvedValueOnce([
      {
        id: "j1",
        userId: "user-1",
        type: "generate",
        status: "complete",
        inputJson: { durationSec: 10, bpm: 90 },
        outputJson: {
          audioUrl: "https://cdn/a.wav",
          assetId: "a",
          replicateUrl: "r",
        },
        errorMessage: null,
      },
    ]);
    const res = await GET(new Request("http://localhost"), ctx("j1"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { audioUrl?: string; status?: string };
    expect(body.status).toBe("complete");
    expect(body.audioUrl).toBe("https://cdn/a.wav");
  });
});
