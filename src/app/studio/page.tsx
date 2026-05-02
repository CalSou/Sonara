"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Disc3 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Transport } from "@/components/studio/Transport";
import { TrackLane } from "@/components/studio/TrackLane";
import { AIPanel } from "@/components/studio/AIPanel";
import { useStudioStore } from "@/lib/store/studioStore";
import { Multitrack } from "@/lib/audio/multitrack";
import { decodeFileToBuffer, getAudioContext } from "@/lib/audio/context";
import { mockProviders } from "@/lib/ai/mock";

export default function StudioPage() {
  const tracks = useStudioStore((s) => s.tracks);
  const selectedId = useStudioStore((s) => s.selectedId);
  const isPlaying = useStudioStore((s) => s.isPlaying);
  const position = useStudioStore((s) => s.position);
  const masterVolume = useStudioStore((s) => s.masterVolume);
  const bpm = useStudioStore((s) => s.bpm);

  const addTrack = useStudioStore((s) => s.addTrack);
  const removeTrack = useStudioStore((s) => s.removeTrack);
  const setBuffer = useStudioStore((s) => s.setBuffer);
  const setName = useStudioStore((s) => s.setName);
  const setVolume = useStudioStore((s) => s.setVolume);
  const setPan = useStudioStore((s) => s.setPan);
  const setMute = useStudioStore((s) => s.setMute);
  const setSolo = useStudioStore((s) => s.setSolo);
  const setSelected = useStudioStore((s) => s.setSelected);
  const setIsPlaying = useStudioStore((s) => s.setIsPlaying);
  const setPosition = useStudioStore((s) => s.setPosition);
  const setMasterVolume = useStudioStore((s) => s.setMasterVolume);
  const setBpm = useStudioStore((s) => s.setBpm);

  const engineRef = useRef<Multitrack | null>(null);
  const rafRef = useRef<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [didSeed, setDidSeed] = useState(false);

  // Lazy-init engine once user interacts
  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new Multitrack(getAudioContext());
      engineRef.current.setMasterVolume(masterVolume);
    }
    return engineRef.current;
  }, [masterVolume]);

  // Seed with 3 empty tracks on first load (no engine yet — that needs a user gesture)
  useEffect(() => {
    if (didSeed || tracks.length > 0) return;
    addTrack({ name: "Drums" });
    addTrack({ name: "Bass" });
    addTrack({ name: "Lead" });
    setDidSeed(true);
  }, [addTrack, didSeed, tracks.length]);

  // Sync engine with state changes
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng) return;
    tracks.forEach((t) => {
      if (t.buffer) eng.setTrackBuffer(t.id, t.buffer);
      eng.setVolume(t.id, t.volume);
      eng.setPan(t.id, t.pan);
      eng.setMute(t.id, t.mute);
      eng.setSolo(t.id, t.solo);
    });
    eng.setMasterVolume(masterVolume);
  }, [tracks, masterVolume]);

  // Position polling
  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const eng = engineRef.current;
      if (!eng) return;
      const pos = eng.getPosition();
      setPosition(pos);
      if (!eng.isPlaying()) {
        setIsPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, setIsPlaying, setPosition]);

  const duration = useMemo(
    () => Math.max(8, ...tracks.map((t) => t.buffer?.duration ?? 0)),
    [tracks],
  );

  const selectedTrack = tracks.find((t) => t.id === selectedId) ?? null;
  const pushLog = (m: string) =>
    setLog((l) => [...l.slice(-30), `${new Date().toLocaleTimeString()}  ${m}`]);

  const handleTogglePlay = () => {
    const eng = ensureEngine();
    // make sure all current buffers are loaded
    tracks.forEach((t) => t.buffer && eng.setTrackBuffer(t.id, t.buffer));
    if (eng.isPlaying()) {
      eng.pause();
      setIsPlaying(false);
    } else {
      eng.play(position);
      setIsPlaying(true);
    }
  };
  const handleStop = () => {
    const eng = ensureEngine();
    eng.stop();
    setIsPlaying(false);
    setPosition(0);
  };
  const handleRewind = () => {
    const eng = ensureEngine();
    eng.seek(0);
    setPosition(0);
  };

  const handleUpload = async (id: string, file: File) => {
    try {
      const buf = await decodeFileToBuffer(file);
      setBuffer(id, buf);
      pushLog(`Loaded "${file.name}" → ${tracks.find((t) => t.id === id)?.name}`);
    } catch (e) {
      pushLog(`Failed to decode ${file.name}: ${(e as Error).message}`);
    }
  };

  const handleGenerate = async (prompt: string, durationSec: number) => {
    const ctx = getAudioContext();
    pushLog(`Generating "${prompt}" (${durationSec}s)…`);
    const result = await mockProviders.generation.generate(
      { prompt, durationSec },
      ctx,
    );
    let targetId = selectedId;
    if (!targetId) targetId = addTrack({ name: prompt.slice(0, 22) });
    setBuffer(targetId, result.buffer);
    setName(targetId, prompt.slice(0, 28));
    pushLog(`Generated ${result.durationSec}s @ ${result.bpm} BPM`);
  };

  const handleSeparateStems = async () => {
    if (!selectedTrack?.buffer) return;
    const ctx = getAudioContext();
    pushLog(`Separating stems for "${selectedTrack.name}"…`);
    const res = await mockProviders.stems.separate(selectedTrack.buffer, ctx);
    const stemColors: Record<string, string> = {
      vocals: "#ec4899",
      drums: "#f59e0b",
      bass: "#10b981",
      other: "#60a5fa",
    };
    (Object.keys(res.stems) as Array<keyof typeof res.stems>).forEach((kind) => {
      const id = addTrack({ name: `${selectedTrack.name} • ${kind}`, color: stemColors[kind] });
      setBuffer(id, res.stems[kind]);
    });
    pushLog(`Created 4 stem tracks`);
  };

  const handleMaster = async (opts: { brightness: number; punch: number }) => {
    if (!selectedTrack?.buffer) return;
    const ctx = getAudioContext();
    pushLog(`Mastering "${selectedTrack.name}"…`);
    const res = await mockProviders.mastering.master(
      selectedTrack.buffer,
      { ...opts, loudnessLufs: -14 },
      ctx,
    );
    setBuffer(selectedTrack.id, res.buffer);
    res.notes.forEach((n) => pushLog(`  ${n}`));
  };

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-bg-panel px-4 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <span className="text-xs text-text-mute">/ Studio</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dj">
            <Button variant="outline" size="sm">
              <Disc3 className="h-4 w-4" /> DJ Console
            </Button>
          </Link>
        </div>
      </header>

      <Transport
        isPlaying={isPlaying}
        position={position}
        duration={duration}
        bpm={bpm}
        masterVolume={masterVolume}
        onTogglePlay={handleTogglePlay}
        onStop={handleStop}
        onRewind={handleRewind}
        onBpmChange={setBpm}
        onMasterVolumeChange={(v) => {
          setMasterVolume(v);
          ensureEngine().setMasterVolume(v);
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-line bg-bg-panel/60 px-4 py-2">
            <div className="text-xs text-text-mute">
              {tracks.length} track{tracks.length === 1 ? "" : "s"}
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => addTrack()}
              aria-label="Add track"
            >
              <Plus className="h-3.5 w-3.5" /> Add track
            </Button>
          </div>

          <div>
            {tracks.map((t) => (
              <TrackLane
                key={t.id}
                track={t}
                selected={t.id === selectedId}
                position={position}
                duration={duration}
                onSelect={() => setSelected(t.id)}
                onRemove={() => removeTrack(t.id)}
                onUpload={(file) => handleUpload(t.id, file)}
                onGenerate={() => {
                  setSelected(t.id);
                  void handleGenerate("warm lofi beat with vinyl crackle", 8);
                }}
                onSeek={(sec) => {
                  ensureEngine().seek(sec);
                  setPosition(sec);
                }}
                onToggleMute={() => setMute(t.id, !t.mute)}
                onToggleSolo={() => setSolo(t.id, !t.solo)}
                onVolume={(v) => setVolume(t.id, v)}
                onPan={(v) => setPan(t.id, v)}
                onRename={(name) => setName(t.id, name)}
              />
            ))}
            {tracks.length === 0 && (
              <div className="p-12 text-center text-sm text-text-mute">
                No tracks yet. Click <span className="text-text">Add track</span> above.
              </div>
            )}
          </div>
        </main>

        <AIPanel
          selectedTrackName={selectedTrack?.name ?? null}
          hasSelectedBuffer={!!selectedTrack?.buffer}
          onGenerate={handleGenerate}
          onSeparateStems={handleSeparateStems}
          onMaster={handleMaster}
          log={log}
        />
      </div>
    </div>
  );
}
