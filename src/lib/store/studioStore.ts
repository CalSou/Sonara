"use client";

import { create } from "zustand";
import { uid } from "@/lib/util";
import { computePeaks } from "@/lib/audio/peaks";

export interface StudioTrack {
  id: string;
  name: string;
  color: string;
  buffer: AudioBuffer | null;
  peaks: number[] | null;
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
}

interface StudioState {
  tracks: StudioTrack[];
  selectedId: string | null;
  isPlaying: boolean;
  position: number;
  masterVolume: number;
  bpm: number;

  /** Replace all tracks at once (used when hydrating from server project JSON). */
  replaceTracks: (
    tracks: StudioTrack[],
    opts?: { selectedId?: string | null },
  ) => void;
  addTrack: (partial?: Partial<StudioTrack>) => string;
  removeTrack: (id: string) => void;
  setBuffer: (id: string, buffer: AudioBuffer) => void;
  setName: (id: string, name: string) => void;
  setVolume: (id: string, v: number) => void;
  setPan: (id: string, v: number) => void;
  setMute: (id: string, v: boolean) => void;
  setSolo: (id: string, v: boolean) => void;
  setSelected: (id: string | null) => void;
  setIsPlaying: (v: boolean) => void;
  setPosition: (v: number) => void;
  setMasterVolume: (v: number) => void;
  setBpm: (bpm: number) => void;
}

const palette = [
  "#a855f7",
  "#22d3ee",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#60a5fa",
  "#f472b6",
];

export const useStudioStore = create<StudioState>((set, get) => ({
  tracks: [],
  selectedId: null,
  isPlaying: false,
  position: 0,
  masterVolume: 0.85,
  bpm: 120,

  replaceTracks: (nextTracks, opts) =>
    set(() => ({
      tracks: nextTracks,
      selectedId:
        opts?.selectedId !== undefined
          ? opts.selectedId
          : nextTracks[0]?.id ?? null,
    })),

  addTrack: (partial) => {
    const id = uid("trk");
    const idx = get().tracks.length;
    const track: StudioTrack = {
      id,
      name: partial?.name ?? `Track ${idx + 1}`,
      color: partial?.color ?? palette[idx % palette.length],
      buffer: partial?.buffer ?? null,
      peaks: partial?.buffer ? computePeaks(partial.buffer) : null,
      volume: partial?.volume ?? 0.85,
      pan: partial?.pan ?? 0,
      mute: partial?.mute ?? false,
      solo: partial?.solo ?? false,
    };
    set((s) => ({ tracks: [...s.tracks, track], selectedId: s.selectedId ?? id }));
    return id;
  },

  removeTrack: (id) =>
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  setBuffer: (id, buffer) =>
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === id ? { ...t, buffer, peaks: computePeaks(buffer) } : t,
      ),
    })),

  setName: (id, name) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, name } : t)) })),
  setVolume: (id, v) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, volume: v } : t)) })),
  setPan: (id, v) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, pan: v } : t)) })),
  setMute: (id, v) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, mute: v } : t)) })),
  setSolo: (id, v) =>
    set((s) => ({ tracks: s.tracks.map((t) => (t.id === id ? { ...t, solo: v } : t)) })),
  setSelected: (id) => set({ selectedId: id }),
  setIsPlaying: (v) => set({ isPlaying: v }),
  setPosition: (v) => set({ position: v }),
  setMasterVolume: (v) => set({ masterVolume: v }),
  setBpm: (bpm) => set({ bpm }),
}));
