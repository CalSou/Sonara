"use client";

import { create } from "zustand";
import type { TrackAnalysis, TransitionPlan } from "@/lib/ai/types";
import { uid } from "@/lib/util";
import { computePeaks } from "@/lib/audio/peaks";

export interface LibraryTrack {
  id: string;
  name: string;
  buffer: AudioBuffer;
  peaks: number[];
  analysis: TrackAnalysis;
  artwork: string; // hex color used as cover swatch
}

export type DeckId = "A" | "B";

export interface DeckState {
  trackId: string | null;
  isPlaying: boolean;
  position: number;
  rate: number; // 0.92..1.08
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  filter: number; // -1..+1
  volume: number;
  cuePoint: number;
}

interface DJStore {
  library: LibraryTrack[];
  deckA: DeckState;
  deckB: DeckState;
  crossfader: number; // -1 (A) .. +1 (B)
  masterVolume: number;
  autoMixOn: boolean;
  plannedTransition: TransitionPlan | null;

  addLibraryTrack: (t: Omit<LibraryTrack, "id" | "peaks"> & { peaks?: number[] }) => string;
  removeLibraryTrack: (id: string) => void;

  loadDeck: (deck: DeckId, trackId: string) => void;
  patchDeck: (deck: DeckId, patch: Partial<DeckState>) => void;
  resetDeckEq: (deck: DeckId) => void;

  setCrossfader: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setAutoMix: (v: boolean) => void;
  setPlannedTransition: (t: TransitionPlan | null) => void;
}

const defaultDeck = (): DeckState => ({
  trackId: null,
  isPlaying: false,
  position: 0,
  rate: 1,
  eqLow: 0,
  eqMid: 0,
  eqHigh: 0,
  filter: 0,
  volume: 0.85,
  cuePoint: 0,
});

export const useDJStore = create<DJStore>((set) => ({
  library: [],
  deckA: defaultDeck(),
  deckB: defaultDeck(),
  crossfader: 0,
  masterVolume: 0.85,
  autoMixOn: false,
  plannedTransition: null,

  addLibraryTrack: (t) => {
    const id = uid("lib");
    const peaks = t.peaks ?? computePeaks(t.buffer);
    set((s) => ({
      library: [...s.library, { ...t, id, peaks }],
    }));
    return id;
  },
  removeLibraryTrack: (id) =>
    set((s) => ({
      library: s.library.filter((t) => t.id !== id),
      deckA: s.deckA.trackId === id ? defaultDeck() : s.deckA,
      deckB: s.deckB.trackId === id ? defaultDeck() : s.deckB,
    })),

  loadDeck: (deck, trackId) =>
    set((s) => ({
      [deck === "A" ? "deckA" : "deckB"]: { ...defaultDeck(), trackId },
    })),

  patchDeck: (deck, patch) =>
    set((s) => ({
      [deck === "A" ? "deckA" : "deckB"]: {
        ...(deck === "A" ? s.deckA : s.deckB),
        ...patch,
      },
    })),

  resetDeckEq: (deck) =>
    set((s) => ({
      [deck === "A" ? "deckA" : "deckB"]: {
        ...(deck === "A" ? s.deckA : s.deckB),
        eqLow: 0,
        eqMid: 0,
        eqHigh: 0,
        filter: 0,
      },
    })),

  setCrossfader: (v) => set({ crossfader: Math.max(-1, Math.min(1, v)) }),
  setMasterVolume: (v) => set({ masterVolume: Math.max(0, Math.min(1, v)) }),
  setAutoMix: (v) => set({ autoMixOn: v }),
  setPlannedTransition: (t) => set({ plannedTransition: t }),
}));

/** Equal-power crossfader gain for a deck. */
export function crossfaderGain(side: DeckId, x: number): number {
  // x: -1 = full A, +1 = full B
  const a = side === "A" ? (1 - x) / 2 : (1 + x) / 2; // 0..1
  return Math.cos((1 - a) * 0.5 * Math.PI);
}
