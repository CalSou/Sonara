import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  sum: vi.fn(),
  resolve: vi.fn(),
  create: vi.fn(),
  insertValues: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/db/index", () => ({
  requireDb: () => ({
    insert: () => ({
      values: mocks.insertValues,
    }),
    update: () => ({
      set: mocks.updateSet,
    }),
  }),
}));

vi.mock("@/lib/ai/server/dailyGenerationBudget", () => ({
  sumGenerationSecondsToday: mocks.sum,
  parseDailySecondsLimit: () => 600,
}));

vi.mock("@/lib/ai/server/factory", () => ({
  resolveEffectiveAiGenerationBackend: () => mocks.resolve(),
  getPublicWebhookBaseUrl: () => "http://localhost:3000",
}));

vi.mock("@/lib/ai/server/replicate", () => ({
  createReplicatePrediction: mocks.create,
}));

import { POST } from "@/app/api/v1/generate/route";

describe("POST /api/v1/generate", () => {
  beforeEach(() => {
    vi.stubEnv("REPLICATE_API_TOKEN", "tok");
    vi.stubEnv("REPLICATE_STABLE_AUDIO_VERSION", "ver-sha");
    mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
    mocks.sum.mockResolvedValue(0);
    mocks.resolve.mockReturnValue("replicate");
    mocks.create.mockResolvedValue({ id: "pred-1" });
    mocks.insertValues.mockResolvedValue(undefined);
    mocks.updateSet.mockReturnValue({ where: mocks.updateWhere });
    mocks.updateWhere.mockResolvedValue(undefined);
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "x", durationSec: 8 }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 503 when backend is mock", async () => {
    mocks.resolve.mockReturnValueOnce("mock");
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "x", durationSec: 8 }),
      }),
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("GENERATION_UNAVAILABLE");
  });

  it("returns 400 on validation failure", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "", durationSec: 8 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 429 when daily budget exceeded", async () => {
    mocks.sum.mockResolvedValueOnce(595);
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hello", durationSec: 10 }),
      }),
    );
    expect(res.status).toBe(429);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("DAILY_LIMIT");
  });

  it("returns 502 when Replicate fails", async () => {
    mocks.create.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hello", durationSec: 8 }),
      }),
    );
    expect(res.status).toBe(502);
  });

  it("returns 202 and starts prediction", async () => {
    const res = await POST(
      new Request("http://localhost/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hello", durationSec: 8, genreId: "lofi" }),
      }),
    );
    expect(res.status).toBe(202);
    const body = (await res.json()) as { job_id?: string; status?: string };
    expect(body.status).toBe("pending");
    expect(body.job_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.create).toHaveBeenCalled();
    expect(mocks.insertValues).toHaveBeenCalled();
    expect(mocks.updateWhere).toHaveBeenCalled();
  });
});
