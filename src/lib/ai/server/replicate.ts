export type CreatePredictionParams = {
  version: string;
  input: Record<string, unknown>;
  webhook: string;
  idempotencyKey: string;
};

export type ReplicatePredictionCreateResponse = {
  id: string;
  status?: string;
  error?: unknown;
};

export class ReplicateApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "ReplicateApiError";
  }
}

/**
 * POST https://api.replicate.com/v1/predictions
 * Uses `version` (pinned sha) per PRD — no implicit latest.
 */
export async function createReplicatePrediction(
  apiToken: string,
  params: CreatePredictionParams,
  fetchImpl: typeof fetch = fetch,
): Promise<ReplicatePredictionCreateResponse> {
  const res = await fetchImpl("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Prefer: "wait=n",
      "Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      version: params.version,
      input: params.input,
      webhook: params.webhook,
      webhook_events_filter: ["completed"],
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new ReplicateApiError(
      `Replicate predictions.create failed (${res.status})`,
      res.status,
      text,
    );
  }

  try {
    const json = JSON.parse(text) as ReplicatePredictionCreateResponse;
    if (!json?.id) {
      throw new ReplicateApiError("Replicate response missing id", res.status, text);
    }
    return json;
  } catch (e) {
    if (e instanceof ReplicateApiError) throw e;
    throw new ReplicateApiError("Invalid JSON from Replicate", res.status, text);
  }
}
