import { describe, it, expect } from "vitest";
import {
  DEFAULT_GENRE_ID,
  MUSIC_GENRES,
  genreLabel,
} from "@/lib/music/genres";

describe("genres catalogue", () => {
  it("has unique ids", () => {
    const ids = MUSIC_GENRES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("default genre resolves to a label", () => {
    expect(genreLabel(DEFAULT_GENRE_ID)).toBeTruthy();
    expect(genreLabel(undefined)).toBeTruthy();
  });
});
