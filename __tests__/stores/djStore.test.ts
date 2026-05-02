import { describe, it, expect, beforeEach } from "vitest";
import { useDJStore, crossfaderGain } from "@/lib/store/djStore";
import type { TrackAnalysis } from "@/lib/ai/types";

const { getState, setState } = useDJStore;

const mockAnalysis: TrackAnalysis = {
  bpm: 128,
  keyCamelot: "8A",
  keyMusical: "Am",
  energy: 0.7,
  durationSec: 180,
};

function createMockAudioBuffer(): AudioBuffer {
  return {
    length: 44100,
    duration: 1,
    sampleRate: 44100,
    numberOfChannels: 2,
    getChannelData: () => new Float32Array(44100),
    copyFromChannel: () => {},
    copyToChannel: () => {},
  } as unknown as AudioBuffer;
}

function reset() {
  setState({
    library: [],
    deckA: {
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
    },
    deckB: {
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
    },
    crossfader: 0,
    masterVolume: 0.85,
    autoMixOn: false,
    plannedTransition: null,
  });
}

describe("djStore", () => {
  beforeEach(reset);

  describe("library management", () => {
    it("addLibraryTrack adds a track with generated id", () => {
      const buffer = createMockAudioBuffer();
      const id = getState().addLibraryTrack({
        name: "Test Track",
        buffer,
        analysis: mockAnalysis,
        artwork: "#ff0000",
      });
      expect(id).toBeDefined();
      expect(getState().library).toHaveLength(1);
      expect(getState().library[0].name).toBe("Test Track");
      expect(getState().library[0].id).toBe(id);
    });

    it("removeLibraryTrack removes the track", () => {
      const buffer = createMockAudioBuffer();
      const id = getState().addLibraryTrack({
        name: "Track",
        buffer,
        analysis: mockAnalysis,
        artwork: "#000",
      });
      getState().removeLibraryTrack(id);
      expect(getState().library).toHaveLength(0);
    });

    it("removeLibraryTrack resets deck if track was loaded", () => {
      const buffer = createMockAudioBuffer();
      const id = getState().addLibraryTrack({
        name: "Track",
        buffer,
        analysis: mockAnalysis,
        artwork: "#000",
      });
      getState().loadDeck("A", id);
      expect(getState().deckA.trackId).toBe(id);
      getState().removeLibraryTrack(id);
      expect(getState().deckA.trackId).toBeNull();
    });
  });

  describe("deck operations", () => {
    it("loadDeck sets trackId and resets deck state", () => {
      const buffer = createMockAudioBuffer();
      const id = getState().addLibraryTrack({
        name: "Track",
        buffer,
        analysis: mockAnalysis,
        artwork: "#000",
      });
      getState().patchDeck("A", { volume: 0.5, eqLow: 3 });
      getState().loadDeck("A", id);
      expect(getState().deckA.trackId).toBe(id);
      expect(getState().deckA.volume).toBe(0.85);
      expect(getState().deckA.eqLow).toBe(0);
    });

    it("patchDeck merges partial state", () => {
      getState().patchDeck("B", { isPlaying: true, volume: 0.6 });
      expect(getState().deckB.isPlaying).toBe(true);
      expect(getState().deckB.volume).toBe(0.6);
      expect(getState().deckB.rate).toBe(1);
    });

    it("resetDeckEq resets EQ and filter to zero", () => {
      getState().patchDeck("A", { eqLow: 5, eqMid: -3, eqHigh: 2, filter: 0.8 });
      getState().resetDeckEq("A");
      expect(getState().deckA.eqLow).toBe(0);
      expect(getState().deckA.eqMid).toBe(0);
      expect(getState().deckA.eqHigh).toBe(0);
      expect(getState().deckA.filter).toBe(0);
    });
  });

  describe("master controls", () => {
    it("setCrossfader clamps to -1..+1", () => {
      getState().setCrossfader(-2);
      expect(getState().crossfader).toBe(-1);
      getState().setCrossfader(5);
      expect(getState().crossfader).toBe(1);
      getState().setCrossfader(0.5);
      expect(getState().crossfader).toBe(0.5);
    });

    it("setMasterVolume clamps to 0..1", () => {
      getState().setMasterVolume(-0.5);
      expect(getState().masterVolume).toBe(0);
      getState().setMasterVolume(2);
      expect(getState().masterVolume).toBe(1);
    });

    it("setAutoMix toggles auto-mix state", () => {
      getState().setAutoMix(true);
      expect(getState().autoMixOn).toBe(true);
      getState().setAutoMix(false);
      expect(getState().autoMixOn).toBe(false);
    });

    it("setPlannedTransition stores transition plan", () => {
      const plan = {
        fromTrackId: "a",
        toTrackId: "b",
        startInToSec: 10,
        crossfadeDurationSec: 8,
        bpmAdjustment: 1.02,
        notes: ["BPM match"],
      };
      getState().setPlannedTransition(plan);
      expect(getState().plannedTransition).toEqual(plan);
      getState().setPlannedTransition(null);
      expect(getState().plannedTransition).toBeNull();
    });
  });

  describe("crossfaderGain", () => {
    it("returns 1 for deck A when crossfader is fully left", () => {
      const gain = crossfaderGain("A", -1);
      expect(gain).toBeCloseTo(1, 5);
    });

    it("returns 0 for deck A when crossfader is fully right", () => {
      const gain = crossfaderGain("A", 1);
      expect(gain).toBeCloseTo(0, 5);
    });

    it("returns 1 for deck B when crossfader is fully right", () => {
      const gain = crossfaderGain("B", 1);
      expect(gain).toBeCloseTo(1, 5);
    });

    it("returns 0 for deck B when crossfader is fully left", () => {
      const gain = crossfaderGain("B", -1);
      expect(gain).toBeCloseTo(0, 5);
    });

    it("returns equal gain for both decks at center", () => {
      const a = crossfaderGain("A", 0);
      const b = crossfaderGain("B", 0);
      expect(a).toBeCloseTo(b, 5);
      expect(a).toBeGreaterThan(0.7);
    });

    it("maintains equal-power property (sum of squares ~1)", () => {
      for (const x of [-1, -0.5, 0, 0.5, 1]) {
        const a = crossfaderGain("A", x);
        const b = crossfaderGain("B", x);
        expect(a * a + b * b).toBeCloseTo(1, 1);
      }
    });
  });
});
