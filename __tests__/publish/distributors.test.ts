import { describe, expect, it } from "vitest";

import { DISTRIBUTORS, distributorById } from "@/lib/publish/distributors";

describe("distributors", () => {
  it("lists known distributors", () => {
    expect(DISTRIBUTORS.length).toBeGreaterThanOrEqual(4);
  });

  it("finds by id", () => {
    expect(distributorById("distrokid")?.label).toContain("DistroKid");
    expect(distributorById("noop" as never)).toBeUndefined();
  });
});
