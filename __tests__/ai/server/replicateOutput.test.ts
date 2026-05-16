import { describe, expect, it } from "vitest";

import {
  extractReplicateAudioUrl,
  stringifyReplicateError,
} from "@/lib/ai/server/replicateOutput";

describe("extractReplicateAudioUrl", () => {
  it("reads string URL", () => {
    expect(extractReplicateAudioUrl("https://cdn.example/a.wav")).toBe(
      "https://cdn.example/a.wav",
    );
  });

  it("reads first URL from array", () => {
    expect(extractReplicateAudioUrl(["https://a", "https://b"])).toBe("https://a");
  });

  it("returns null for garbage", () => {
    expect(extractReplicateAudioUrl(null)).toBeNull();
    expect(extractReplicateAudioUrl({})).toBeNull();
  });
});

describe("stringifyReplicateError", () => {
  it("stringifies objects", () => {
    expect(stringifyReplicateError({ msg: "x" })).toContain("msg");
  });
});
