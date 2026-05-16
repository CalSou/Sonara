import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { parseReleaseMetadata } from "@/lib/publish/release";

describe("eval: publish metadata contract", () => {
  it("parses minimal valid handoff payload shape", () => {
    const fixture = {
      releaseTitle: "Test EP",
      trackTitle: "Lead",
      primaryArtist: "Eval Artist",
      genreId: "electronic",
      language: "en",
      explicit: false,
    };
    const parsed = parseReleaseMetadata(fixture);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.genreId).toBe("electronic");
    }
  });

  it("dataset dir is readable", () => {
    const stemsMd = readFileSync(join(process.cwd(), "eval", "datasets", "stems_fixtures.md"), "utf8");
    expect(stemsMd.length).toBeGreaterThan(10);
  });
});
