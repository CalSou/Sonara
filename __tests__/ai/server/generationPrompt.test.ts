import { describe, expect, it } from "vitest";

import { buildStableAudioPrompt } from "@/lib/ai/server/generationPrompt";

describe("buildStableAudioPrompt", () => {
  it("returns trimmed prompt when genre omitted", () => {
    expect(buildStableAudioPrompt("  chill beat  ", undefined)).toBe("chill beat");
  });

  it("appends genre label", () => {
    expect(buildStableAudioPrompt("pads", "lofi")).toMatch(/\[genre: Lo-fi\]/);
  });
});
