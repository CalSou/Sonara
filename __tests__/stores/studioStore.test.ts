import { describe, it, expect, beforeEach } from "vitest";
import { useStudioStore } from "@/lib/store/studioStore";

const { getState, setState } = useStudioStore;

function reset() {
  setState({
    tracks: [],
    selectedId: null,
    isPlaying: false,
    position: 0,
    masterVolume: 0.85,
    bpm: 120,
    replaceTracks: getState().replaceTracks,
    addTrack: getState().addTrack,
    removeTrack: getState().removeTrack,
    setBuffer: getState().setBuffer,
    setName: getState().setName,
    setVolume: getState().setVolume,
    setPan: getState().setPan,
    setMute: getState().setMute,
    setSolo: getState().setSolo,
    setSelected: getState().setSelected,
    setIsPlaying: getState().setIsPlaying,
    setPosition: getState().setPosition,
    setMasterVolume: getState().setMasterVolume,
    setBpm: getState().setBpm,
  });
}

describe("studioStore", () => {
  beforeEach(reset);

  describe("addTrack", () => {
    it("adds a track with generated id and default values", () => {
      const id = getState().addTrack();
      const track = getState().tracks.find((t) => t.id === id);
      expect(track).toBeDefined();
      expect(track!.name).toBe("Track 1");
      expect(track!.buffer).toBeNull();
      expect(track!.peaks).toBeNull();
      expect(track!.volume).toBe(0.85);
      expect(track!.pan).toBe(0);
      expect(track!.mute).toBe(false);
      expect(track!.solo).toBe(false);
    });

    it("accepts partial overrides", () => {
      const id = getState().addTrack({ name: "Drums", volume: 0.5 });
      const track = getState().tracks.find((t) => t.id === id)!;
      expect(track.name).toBe("Drums");
      expect(track.volume).toBe(0.5);
    });

    it("auto-selects the first added track", () => {
      const id = getState().addTrack();
      expect(getState().selectedId).toBe(id);
    });

    it("does not change selection on subsequent adds", () => {
      const first = getState().addTrack();
      getState().addTrack();
      expect(getState().selectedId).toBe(first);
    });

    it("assigns colors from palette in order", () => {
      const id1 = getState().addTrack();
      const id2 = getState().addTrack();
      const t1 = getState().tracks.find((t) => t.id === id1)!;
      const t2 = getState().tracks.find((t) => t.id === id2)!;
      expect(t1.color).not.toBe(t2.color);
    });
  });

  describe("removeTrack", () => {
    it("removes the track from state", () => {
      const id = getState().addTrack();
      expect(getState().tracks).toHaveLength(1);
      getState().removeTrack(id);
      expect(getState().tracks).toHaveLength(0);
    });

    it("clears selectedId if removed track was selected", () => {
      const id = getState().addTrack();
      expect(getState().selectedId).toBe(id);
      getState().removeTrack(id);
      expect(getState().selectedId).toBeNull();
    });

    it("preserves selectedId if a different track was removed", () => {
      const first = getState().addTrack();
      const second = getState().addTrack();
      getState().setSelected(second);
      getState().removeTrack(first);
      expect(getState().selectedId).toBe(second);
    });
  });

  describe("replaceTracks", () => {
    it("replaces all tracks and optionally selection", () => {
      getState().addTrack({ name: "A" });
      getState().addTrack({ name: "B" });
      const next = [
        {
          id: "x1",
          name: "Imported",
          color: "#a855f7",
          buffer: null,
          peaks: null,
          volume: 0.5,
          pan: 0,
          mute: true,
          solo: false,
        },
      ];
      getState().replaceTracks(next, { selectedId: "x1" });
      expect(getState().tracks).toHaveLength(1);
      expect(getState().tracks[0].name).toBe("Imported");
      expect(getState().selectedId).toBe("x1");
    });

    it("defaults selection to first track when opts omitted", () => {
      getState().replaceTracks([
        {
          id: "a",
          name: "One",
          color: "#fff",
          buffer: null,
          peaks: null,
          volume: 1,
          pan: 0,
          mute: false,
          solo: false,
        },
        {
          id: "b",
          name: "Two",
          color: "#000",
          buffer: null,
          peaks: null,
          volume: 1,
          pan: 0,
          mute: false,
          solo: false,
        },
      ]);
      expect(getState().selectedId).toBe("a");
    });
  });

  describe("track property setters", () => {
    it("setBuffer attaches buffer and peaks", () => {
      const id = getState().addTrack();
      const buf = {
        length: 1024,
        duration: 1024 / 44100,
        sampleRate: 44100,
        numberOfChannels: 1,
        getChannelData: () => {
          const a = new Float32Array(1024);
          a.fill(0.5);
          return a;
        },
        copyFromChannel: () => {},
        copyToChannel: () => {},
      } as unknown as AudioBuffer;
      getState().setBuffer(id, buf);
      const t = getState().tracks[0];
      expect(t.buffer).toBe(buf);
      expect(t.peaks).not.toBeNull();
      expect(t.peaks!.length).toBeGreaterThan(0);
    });

    it("setName updates track name", () => {
      const id = getState().addTrack();
      getState().setName(id, "Bass");
      expect(getState().tracks[0].name).toBe("Bass");
    });

    it("setVolume updates track volume", () => {
      const id = getState().addTrack();
      getState().setVolume(id, 0.5);
      expect(getState().tracks[0].volume).toBe(0.5);
    });

    it("setPan updates track pan", () => {
      const id = getState().addTrack();
      getState().setPan(id, -0.7);
      expect(getState().tracks[0].pan).toBe(-0.7);
    });

    it("setMute updates track mute", () => {
      const id = getState().addTrack();
      getState().setMute(id, true);
      expect(getState().tracks[0].mute).toBe(true);
    });

    it("setSolo updates track solo", () => {
      const id = getState().addTrack();
      getState().setSolo(id, true);
      expect(getState().tracks[0].solo).toBe(true);
    });
  });

  describe("transport state", () => {
    it("setIsPlaying toggles playing state", () => {
      getState().setIsPlaying(true);
      expect(getState().isPlaying).toBe(true);
      getState().setIsPlaying(false);
      expect(getState().isPlaying).toBe(false);
    });

    it("setPosition updates position", () => {
      getState().setPosition(42.5);
      expect(getState().position).toBe(42.5);
    });

    it("setMasterVolume updates master volume", () => {
      getState().setMasterVolume(0.6);
      expect(getState().masterVolume).toBe(0.6);
    });

    it("setBpm updates bpm", () => {
      getState().setBpm(140);
      expect(getState().bpm).toBe(140);
    });
  });
});
