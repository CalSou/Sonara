import { describe, it, expect } from "vitest";
import { fmtTime, uid, clsx } from "@/lib/util";

describe("fmtTime", () => {
  it("formats 0 seconds", () => {
    expect(fmtTime(0)).toBe("0:00.00");
  });

  it("formats fractional seconds", () => {
    expect(fmtTime(1.5)).toBe("0:01.50");
  });

  it("formats minutes and seconds", () => {
    expect(fmtTime(65.25)).toBe("1:05.25");
  });

  it("handles negative values as 0", () => {
    expect(fmtTime(-5)).toBe("0:00.00");
  });

  it("handles Infinity as 0", () => {
    expect(fmtTime(Infinity)).toBe("0:00.00");
  });

  it("handles NaN as 0", () => {
    expect(fmtTime(NaN)).toBe("0:00.00");
  });
});

describe("uid", () => {
  it("generates unique ids", () => {
    const a = uid("test");
    const b = uid("test");
    expect(a).not.toBe(b);
  });

  it("uses the provided prefix", () => {
    const id = uid("trk");
    expect(id.startsWith("trk_")).toBe(true);
  });

  it("uses default prefix when none provided", () => {
    const id = uid();
    expect(id.startsWith("id_")).toBe(true);
  });
});

describe("clsx", () => {
  it("joins strings", () => {
    expect(clsx("a", "b", "c")).toBe("a b c");
  });

  it("filters falsy values", () => {
    expect(clsx("a", false, null, undefined, "b")).toBe("a b");
  });

  it("returns empty string for all falsy", () => {
    expect(clsx(false, null, undefined)).toBe("");
  });
});
