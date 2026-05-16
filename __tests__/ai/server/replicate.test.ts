import { describe, expect, it, vi } from "vitest";

import {
  createReplicatePrediction,
  ReplicateApiError,
} from "@/lib/ai/server/replicate";

describe("createReplicatePrediction", () => {
  it("posts predictions payload and returns id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "pred_123", status: "starting" }), {
        status: 201,
      }),
    );

    const out = await createReplicatePrediction(
      "tok",
      {
        version: "ver-sha",
        input: { prompt: "hi", seconds_total: 8 },
        webhook: "https://example.com/hook",
        idempotencyKey: "job-uuid",
      },
      fetchMock,
    );

    expect(out.id).toBe("pred_123");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.replicate.com/v1/predictions");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers["Idempotency-Key"]).toBe("job-uuid");
    const body = JSON.parse(init.body as string);
    expect(body.version).toBe("ver-sha");
    expect(body.webhook_events_filter).toEqual(["completed"]);
  });

  it("throws ReplicateApiError on HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 502 }));

    await expect(
      createReplicatePrediction(
        "tok",
        {
          version: "v",
          input: {},
          webhook: "https://x/h",
          idempotencyKey: "k",
        },
        fetchMock,
      ),
    ).rejects.toBeInstanceOf(ReplicateApiError);
  });

  it("throws when JSON missing id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), { status: 201 }),
    );

    await expect(
      createReplicatePrediction(
        "tok",
        {
          version: "v",
          input: {},
          webhook: "https://x/h",
          idempotencyKey: "k",
        },
        fetchMock,
      ),
    ).rejects.toBeInstanceOf(ReplicateApiError);
  });
});
