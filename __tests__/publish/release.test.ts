import { describe, expect, it } from "vitest";

import { parseReleaseMetadata } from "@/lib/publish/release";

describe("ReleaseMetadata", () => {
  it("requires core fields", () => {
    const bad = parseReleaseMetadata({});
    expect(bad.success).toBe(false);
  });

  it("accepts minimal valid payload", () => {
    const ok = parseReleaseMetadata({
      releaseTitle: "EP One",
      trackTitle: "Lead single",
      primaryArtist: "Artist",
      genreId: "electronic",
      language: "en",
      explicit: false,
    });
    expect(ok.success).toBe(true);
  });
});
