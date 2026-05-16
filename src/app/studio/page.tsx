"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Disc3, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Transport } from "@/components/studio/Transport";
import { TrackLane } from "@/components/studio/TrackLane";
import { AIPanel } from "@/components/studio/AIPanel";
import { useStudioStore } from "@/lib/store/studioStore";
import { Multitrack } from "@/lib/audio/multitrack";
import { decodeFileToBuffer, getAudioContext } from "@/lib/audio/context";
import { mockProviders } from "@/lib/ai/mock";
import { useSession, signOut } from "next-auth/react";
import type { StudioTrack } from "@/lib/store/studioStore";
import {
  studioStateToWire,
  wireToStudioPayload,
  type StudioStateWire,
} from "@/lib/studio/projectSync";
import { bufferToWavBlob } from "@/components/studio/PublishPanel";
import { DEFAULT_GENRE_ID } from "@/lib/music/genres";

export default function StudioPage() {
  const { status, data: session } = useSession();
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
  const replaceTracks = useStudioStore((s) => s.replaceTracks);
  const setGenreId = useStudioStore((s) => s.setGenreId);

  const engineRef = useRef<Multitrack | null>(null);
  const rafRef = useRef<number | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [didSeed, setDidSeed] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Untitled project");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const pushLog = useCallback((m: string) => {
    setLog((l) => [...l.slice(-30), `${new Date().toLocaleTimeString()}  ${m}`]);
  }, []);

  // Lazy-init engine once user interacts
  const ensureEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new Multitrack(getAudioContext());
      engineRef.current.setMasterVolume(masterVolume);
      engineRef.current.setTargetBpm(bpm);
    }
    return engineRef.current;
  }, [masterVolume, bpm]);

  // Seed with 3 empty tracks on first load (no engine yet; needs a user gesture)
  useEffect(() => {
    if (didSeed || tracks.length > 0) return;
    addTrack({ name: "Drums" });
    addTrack({ name: "Bass" });
    addTrack({ name: "Lead" });
    setDidSeed(true);
  }, [addTrack, didSeed, tracks.length]);

  /** Signed-in + DATABASE_URL on server → cloud save/load available */
  const cloudPersistenceAvailable = status === "authenticated";

  const applyHydratedState = useCallback(
    async (wire: StudioStateWire) => {
      const ctx = getAudioContext();
      const payload = await wireToStudioPayload(ctx, wire);
      engineRef.current?.stop();
      engineRef.current = null;
      replaceTracks(payload.tracks as StudioTrack[], {
        selectedId: payload.selectedId,
      });
      setIsPlaying(false);
      setPosition(payload.position);
      setMasterVolume(payload.masterVolume);
      setBpm(payload.bpm);
    },
    [
      replaceTracks,
      setBpm,
      setIsPlaying,
      setMasterVolume,
      setPosition,
    ],
  );

  const cloudHydratedRef = useRef(false);

  useEffect(() => {
    if (!cloudPersistenceAvailable) {
      cloudHydratedRef.current = false;
      return;
    }
    if (cloudHydratedRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/projects");
        if (cancelled) return;
        if (res.status === 503) {
          pushLog(
            "Cloud projects unavailable. Set DATABASE_URL and run npm run db:migrate.",
          );
          cloudHydratedRef.current = true;
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as {
          projects: Array<{
            id: string;
            name: string;
            stateJson: unknown;
            bpm: number | null;
          }>;
        };
        const row = data.projects?.[0];
        if (!row) {
          cloudHydratedRef.current = true;
          return;
        }
        const sj = row.stateJson as StudioStateWire | undefined;
        if (!sj || sj.version !== 1) {
          cloudHydratedRef.current = true;
          return;
        }
        setProjectId(row.id);
        setProjectName(row.name);
        await applyHydratedState(sj);
        if (typeof row.bpm === "number") setBpm(row.bpm);
        pushLog(`Loaded cloud project "${row.name}"`);
      } catch {
        /* ignore */
      } finally {
        cloudHydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    cloudPersistenceAvailable,
    applyHydratedState,
    setBpm,
    pushLog,
  ]);

  const handleSaveProject = async () => {
    if (!cloudPersistenceAvailable) {
      pushLog("Sign in to save. Use Register or Sign in in the header.");
      setSyncStatus("Sign in required");
      setTimeout(() => setSyncStatus(null), 2500);
      return;
    }
    setSyncStatus("Saving…");
    try {
      const wire = await studioStateToWire({
        tracks,
        selectedId,
        isPlaying,
        position,
        masterVolume,
        bpm,
      });
      const body = {
        id: projectId ?? undefined,
        name: projectName,
        bpm,
        state_json: wire as unknown as Record<string, unknown>,
      };
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        pushLog(
          `Save failed: ${(data as { error?: string }).error ?? "Database not configured"}`,
        );
        setSyncStatus("DB not configured");
        setTimeout(() => setSyncStatus(null), 3000);
        return;
      }
      if (!res.ok) {
        pushLog(`Save failed: ${(data as { error?: string }).error ?? res.status}`);
        setSyncStatus("Save failed");
        return;
      }
      const proj = (data as { project?: { id: string } }).project;
      if (proj?.id) setProjectId(proj.id);
      pushLog(`Saved "${projectName}" to cloud`);
      setSyncStatus("Saved");
      setTimeout(() => setSyncStatus(null), 2000);
    } catch (e) {
      pushLog(`Save error: ${(e as Error).message}`);
      setSyncStatus("Save failed");
    }
  };

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

  useEffect(() => {
    engineRef.current?.setTargetBpm(bpm);
  }, [bpm]);

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
      pushLog(`Loaded "${file.name}" into ${tracks.find((t) => t.id === id)?.name}`);
    } catch (e) {
      pushLog(`Failed to decode ${file.name}: ${(e as Error).message}`);
    }
  };

  const handleGenerate = async (
    prompt: string,
    durationSec: number,
    genreId: string,
  ) => {
    const ctx = getAudioContext();
    pushLog(`Generating "${prompt}" (${durationSec}s, genre ${genreId})…`);
    const result = await mockProviders.generation.generate(
      { prompt, durationSec, genreId },
      ctx,
    );
    let targetId = selectedId;
    if (!targetId) targetId = addTrack({ name: prompt.slice(0, 22), genreId });
    setBuffer(targetId, result.buffer);
    setName(targetId, prompt.slice(0, 28));
    setGenreId(targetId, genreId);
    pushLog(`Generated ${result.durationSec}s @ ${result.bpm} BPM`);
  };

  const getSelectedWavBlob = useCallback(async () => {
    const buf = selectedTrack?.buffer;
    if (!buf) return null;
    return bufferToWavBlob(buf);
  }, [selectedTrack?.buffer]);

  const getSelectedAudioBuffer = useCallback(
    () => selectedTrack?.buffer ?? null,
    [selectedTrack?.buffer],
  );

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
      const id = addTrack({
        name: `${selectedTrack.name} • ${kind}`,
        color: stemColors[kind],
        genreId: selectedTrack.genreId,
      });
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

  const timelineProgress = duration > 0 ? Math.min(1, position / duration) : 0;

  return (
    <div className="relative flex h-screen flex-col bg-bg">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-35" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[min(55vh,520px)] w-[min(110vw,900px)] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-line/80 bg-bg-panel/75 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Logo />
          <span className="rounded-full border border-line/60 bg-bg-deep/50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-text-mute">
            Studio
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="hidden rounded-lg border border-line/80 bg-bg-deep/60 px-2.5 py-1 text-xs text-text outline-none transition placeholder:text-text-mute focus:border-accent/50 sm:block sm:w-40 md:w-52"
            placeholder="Untitled project"
            aria-label="Project name"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleSaveProject()}
            disabled={status !== "authenticated"}
            title={
              status === "authenticated"
                ? "Save project to PostgreSQL"
                : "Sign in to enable cloud save"
            }
          >
            Save project
          </Button>
          {syncStatus && (
            <span className="text-xs text-text-mute">{syncStatus}</span>
          )}
          {status === "authenticated" ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-text-dim md:inline" title={session?.user?.email ?? ""}>
                {session?.user?.email ?? session?.user?.name ?? "Signed in"}
              </span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => void signOut({ callbackUrl: "/" })}
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/register?next=%2Fstudio">
                <Button variant="subtle" size="sm">
                  Register
                </Button>
              </Link>
              <Link href="/guest-login?next=%2Fstudio">
                <Button variant="outline" size="sm">
                  Sign in
                </Button>
              </Link>
            </>
          )}
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
        onBpmChange={(v) => {
          setBpm(v);
          engineRef.current?.setTargetBpm(v);
        }}
        onMasterVolumeChange={(v) => {
          setMasterVolume(v);
          ensureEngine().setMasterVolume(v);
        }}
      />

      <div className="relative z-10 flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden bg-bg-deep/20">
          <div className="flex shrink-0 items-center justify-between border-b border-line/70 bg-bg-panel/40 px-4 py-2 backdrop-blur-sm">
            <div className="font-mono text-[11px] tabular-nums text-text-mute">
              {tracks.length} track{tracks.length === 1 ? "" : "s"}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-accent/35 text-accent hover:border-accent hover:bg-accent/10"
              onClick={() => addTrack()}
              aria-label="Add track"
            >
              <Plus className="h-3.5 w-3.5" /> Add track
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {tracks.map((t) => (
              <TrackLane
                key={t.id}
                track={t}
                selected={t.id === selectedId}
                position={position}
                duration={duration}
                timelineProgress={timelineProgress}
                isTimelinePlaying={isPlaying}
                onSelect={() => setSelected(t.id)}
                onRemove={() => {
                  engineRef.current?.removeTrack(t.id);
                  removeTrack(t.id);
                }}
                onUpload={(file) => handleUpload(t.id, file)}
                onGenerate={() => {
                  setSelected(t.id);
                  void handleGenerate(
                    "warm lofi beat with vinyl crackle",
                    8,
                    t.genreId,
                  );
                }}
                onGenreChange={(gid) => setGenreId(t.id, gid)}
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
          selectedGenreId={selectedTrack?.genreId ?? DEFAULT_GENRE_ID}
          hasSelectedBuffer={!!selectedTrack?.buffer}
          onGenerate={handleGenerate}
          onSeparateStems={handleSeparateStems}
          onMaster={handleMaster}
          getSelectedWavBlob={getSelectedWavBlob}
          getSelectedAudioBuffer={getSelectedAudioBuffer}
          logLines={log}
          appendLog={pushLog}
        />
      </div>
    </div>
  );
}
