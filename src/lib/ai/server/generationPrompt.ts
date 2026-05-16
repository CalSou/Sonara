import { genreLabel } from "@/lib/music/genres";

/** Append catalogue genre label so Stable Audio steers toward the chosen style. */
export function buildStableAudioPrompt(prompt: string, genreId?: string | null): string {
  const p = prompt.trim();
  if (!genreId?.trim()) return p;
  const label = genreLabel(genreId);
  return `${p} [genre: ${label}]`;
}
