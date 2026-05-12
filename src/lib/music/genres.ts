/**
 * Curated genre catalogue for generation steering (mock engine + UX labels).
 * Maps to synthesis presets in `mock.ts`.
 */

export type GenreCatalogEntry = {
  /** Stable id stored on projects and passed to generation */
  id: string;
  /** Display label */
  label: string;
};

/** Keep ids lowercase slug-style for URLs and API payloads */
export const MUSIC_GENRES: GenreCatalogEntry[] = [
  { id: "electronic", label: "Electronic" },
  { id: "house", label: "House" },
  { id: "techno", label: "Techno" },
  { id: "trance", label: "Trance" },
  { id: "drum-bass", label: "Drum & Bass" },
  { id: "dubstep", label: "Dubstep" },
  { id: "hip-hop", label: "Hip-hop" },
  { id: "trap", label: "Trap" },
  { id: "rnb", label: "R&B / Soul" },
  { id: "pop", label: "Pop" },
  { id: "rock", label: "Rock" },
  { id: "metal", label: "Metal" },
  { id: "indie", label: "Indie / Alternative" },
  { id: "jazz", label: "Jazz" },
  { id: "classical", label: "Classical / Orchestral" },
  { id: "ambient", label: "Ambient" },
  { id: "lofi", label: "Lo-fi" },
  { id: "latin", label: "Latin" },
  { id: "afrobeats", label: "Afrobeats" },
  { id: "reggae", label: "Reggae / Dancehall" },
  { id: "folk", label: "Folk / Acoustic" },
  { id: "country", label: "Country" },
  { id: "world", label: "World" },
  { id: "experimental", label: "Experimental" },
];

export const DEFAULT_GENRE_ID = "electronic";

export function genreLabel(id: string | null | undefined): string {
  if (!id) return MUSIC_GENRES.find((g) => g.id === DEFAULT_GENRE_ID)?.label ?? "Electronic";
  return MUSIC_GENRES.find((g) => g.id === id)?.label ?? id;
}
