"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Music2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Deck } from "@/components/dj/Deck";
import { Mixer } from "@/components/dj/Mixer";
import { Library } from "@/components/dj/Library";
import { AutoMixPanel } from "@/components/dj/AutoMixPanel";
import {
  crossfaderGain,
  useDJStore,
  type DeckId,
  type DeckState,
  type LibraryTrack,
} from "@/lib/store/djStore";
import { Deck as DeckEngine } from "@/lib/audio/deck";
import { decodeFileToBuffer, getAudioContext } from "@/lib/audio/context";
import {
  buildStarterLibrary,
  specToAnalysis,
} from "@/lib/audio/sampleTracks";
import { mockProviders } from "@/lib/ai/mock";
import type { TransitionPlan } from "@/lib/ai/types";

export default function DJPage() {
  const library = useDJStore((s) => s.library);
  const deckA = useDJStore((s) => s.deckA);
  const deckB = useDJStore((s) => s.deckB);
  const crossfader = useDJStore((s) => s.crossfader);
  const masterVolume = useDJStore((s) => s.masterVolume);
  const autoMixOn = useDJStore((s) => s.autoMixOn);
  const plannedTransition = useDJStore((s) => s.plannedTransition);

  const addLibraryTrack = useDJStore((s) => s.addLibraryTrack);
  const loadDeckStore = useDJStore((s) => s.loadDeck);
  const patchDeck = useDJStore((s) => s.patchDeck);
  const resetDeckEqStore = useDJStore((s) => s.resetDeckEq);
  const setCrossfader = useDJStore((s) => s.setCrossfader);
  const setMasterVolume = useDJStore((s) => s.setMasterVolume);
  const setAutoMix = useDJStore((s) => s.setAutoMix);
  const setPlannedTransition = useDJStore((s) => s.setPlannedTransition);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const aGainRef = useRef<GainNode | null>(null);
  const bGainRef = useRef<GainNode | null>(null);
  const deckAEngineRef = useRef<DeckEngine | null>(null);
  const deckBEngineRef = useRef<DeckEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const seededRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (m: string) =>
    setLog((l) => [...l.slice(-30), `${new Date().toLocaleTimeString()}  ${m}`]);

  /** Build the AudioContext + deck engines + master/crossfader topology. */
  const ensureEngines = useCallback(() => {
    if (ctxRef.current) {
      return {
        a: deckAEngineRef.current!,
        b: deckBEngineRef.current!,
        ctx: ctxRef.current,
      };
    }
    const ctx = getAudioContext();
    const master = ctx.createGain();
    master.gain.value = masterVolume;
    master.connect(ctx.destination);

    const aGain = ctx.createGain();
    const bGain = ctx.createGain();
    aGain.gain.value = crossfaderGain("A", crossfader);
    bGain.gain.value = crossfaderGain("B", crossfader);
    aGain.connect(master);
    bGain.connect(master);

    const a = new DeckEngine(ctx);
    const b = new DeckEngine(ctx);
    a.out.connect(aGain);
    b.out.connect(bGain);

    ctxRef.current = ctx;
    masterGainRef.current = master;
    aGainRef.current = aGain;
    bGainRef.current = bGain;
    deckAEngineRef.current = a;
    deckBEngineRef.current = b;

    return { a, b, ctx };
  }, [crossfader, masterVolume]);

  /** Seed library with procedural samples on first user gesture. */
  const seedLibrary = useCallback(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    const ctx = getAudioContext();
    const samples = buildStarterLibrary(ctx);
    samples.forEach(({ spec, buffer }) => {
      addLibraryTrack({
        name: spec.name,
        buffer,
        artwork: spec.artwork,
        analysis: specToAnalysis(spec),
      });
    });
    pushLog(`Loaded ${samples.length} starter tracks`);
  }, [addLibraryTrack]);

  /** Sync engine state with store (EQ, filter, volume, rate). */
  useEffect(() => {
    const a = deckAEngineRef.current;
    if (a) {
      a.setEq({ low: deckA.eqLow, mid: deckA.eqMid, high: deckA.eqHigh });
      a.setFilter(deckA.filter);
      a.setVolume(deckA.volume);
      a.setRate(deckA.rate);
    }
  }, [deckA.eqLow, deckA.eqMid, deckA.eqHigh, deckA.filter, deckA.volume, deckA.rate]);

  useEffect(() => {
    const b = deckBEngineRef.current;
    if (b) {
      b.setEq({ low: deckB.eqLow, mid: deckB.eqMid, high: deckB.eqHigh });
      b.setFilter(deckB.filter);
      b.setVolume(deckB.volume);
      b.setRate(deckB.rate);
    }
  }, [deckB.eqLow, deckB.eqMid, deckB.eqHigh, deckB.filter, deckB.volume, deckB.rate]);

  /** Crossfader & master sync. */
  useEffect(() => {
    if (aGainRef.current) aGainRef.current.gain.value = crossfaderGain("A", crossfader);
    if (bGainRef.current) bGainRef.current.gain.value = crossfaderGain("B", crossfader);
  }, [crossfader]);
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = masterVolume;
  }, [masterVolume]);

  /** Position polling */
  useEffect(() => {
    const tick = () => {
      const a = deckAEngineRef.current;
      const b = deckBEngineRef.current;
      if (a && (a.isPlaying() || deckA.isPlaying)) {
        const pos = a.getPosition();
        patchDeck("A", { position: pos, isPlaying: a.isPlaying() });
      }
      if (b && (b.isPlaying() || deckB.isPlaying)) {
        const pos = b.getPosition();
        patchDeck("B", { position: pos, isPlaying: b.isPlaying() });
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [deckA.isPlaying, deckB.isPlaying, patchDeck]);

  const trackById = (id: string | null) =>
    id ? library.find((t) => t.id === id) ?? null : null;

  const trackA = trackById(deckA.trackId);
  const trackB = trackById(deckB.trackId);

  const loadDeck = (deck: DeckId, libId: string) => {
    seedLibrary();
    ensureEngines();
    const t = library.find((x) => x.id === libId);
    if (!t) return;
    const eng = deck === "A" ? deckAEngineRef.current! : deckBEngineRef.current!;
    eng.load(t.buffer);
    loadDeckStore(deck, libId);
    pushLog(`Loaded ${t.name} → Deck ${deck}`);
  };

  const handleDeckTogglePlay = (deck: DeckId) => {
    const { a, b } = ensureEngines();
    const eng = deck === "A" ? a : b;
    const state = deck === "A" ? deckA : deckB;
    const t = trackById(state.trackId);
    if (!t) return;
    if (!eng.hasBuffer()) eng.load(t.buffer);
    if (eng.isPlaying()) {
      eng.pause();
      patchDeck(deck, { isPlaying: false });
    } else {
      eng.play();
      patchDeck(deck, { isPlaying: true });
    }
  };

  const handleDeckCue = (deck: DeckId) => {
    const eng = deck === "A" ? deckAEngineRef.current : deckBEngineRef.current;
    const state = deck === "A" ? deckA : deckB;
    if (!eng) return;
    if (eng.isPlaying()) {
      eng.seek(state.cuePoint);
    } else {
      patchDeck(deck, { cuePoint: state.position });
    }
  };

  const handleDeckSeek = (deck: DeckId, sec: number) => {
    const eng = deck === "A" ? deckAEngineRef.current : deckBEngineRef.current;
    if (!eng) return;
    eng.seek(sec);
    patchDeck(deck, { position: sec });
  };

  const handleEq = (deck: DeckId, band: "low" | "mid" | "high", v: number) => {
    const key = (band === "low" ? "eqLow" : band === "mid" ? "eqMid" : "eqHigh") as keyof DeckState;
    patchDeck(deck, { [key]: v } as Partial<DeckState>);
  };

  const handleUpload = async (file: File) => {
    try {
      seedLibrary();
      const ctx = getAudioContext();
      const buf = await decodeFileToBuffer(file);
      const analysis = await mockProviders.analysis.analyze(buf);
      addLibraryTrack({
        name: file.name.replace(/\.[^.]+$/, ""),
        buffer: buf,
        analysis,
        artwork: "#a855f7",
      });
      pushLog(`Imported ${file.name} (${analysis.bpm} BPM, ${analysis.keyCamelot})`);
      // suppress unused
      void ctx;
    } catch (e) {
      pushLog(`Failed to import ${file.name}: ${(e as Error).message}`);
    }
  };

  const planTransition = async () => {
    if (!trackA || !trackB) return;
    setBusy(true);
    try {
      const plan = await mockProviders.autoMix.planTransition(
        { id: trackA.id, analysis: trackA.analysis },
        { id: trackB.id, analysis: trackB.analysis },
      );
      setPlannedTransition(plan);
      pushLog(`Planned A→B: ${plan.notes[0]}`);
      // Apply the rate adjustment to deck B for beatmatching
      const newRate = Math.max(0.92, Math.min(1.08, plan.bpmAdjustment));
      patchDeck("B", { rate: newRate });
      pushLog(`Adjusted Deck B pitch to ${((newRate - 1) * 100).toFixed(2)}%`);
    } finally {
      setBusy(false);
    }
  };

  const autoSetlist = async () => {
    if (library.length === 0) return;
    setBusy(true);
    try {
      const result = await mockProviders.autoMix.buildSetlist(
        library.map((l: LibraryTrack) => ({ id: l.id, analysis: l.analysis })),
      );
      pushLog(`Built setlist of ${result.orderedTrackIds.length} tracks`);
      // Load the first two
      if (result.orderedTrackIds[0]) loadDeck("A", result.orderedTrackIds[0]);
      if (result.orderedTrackIds[1]) loadDeck("B", result.orderedTrackIds[1]);
      if (result.transitions[0]) {
        setPlannedTransition(result.transitions[0]);
      }
    } finally {
      setBusy(false);
    }
  };

  // Auto-mix mode: when deck A is near the end, auto-trigger crossfade to B
  useEffect(() => {
    if (!autoMixOn || !plannedTransition) return;
    if (!trackA || !trackB) return;
    const dur = trackA.analysis.durationSec;
    const remaining = dur - deckA.position;
    const xfDur = plannedTransition.crossfadeDurationSec;
    if (remaining <= xfDur && remaining > 0 && deckA.isPlaying) {
      // begin crossfade if not already
      if (!deckB.isPlaying) {
        const b = deckBEngineRef.current;
        b?.play(plannedTransition.startInToSec);
        patchDeck("B", { isPlaying: true });
        pushLog(`Auto-Mix: started Deck B`);
      }
      // ramp crossfader
      const progress = 1 - remaining / xfDur;
      setCrossfader(-1 + progress * 2);
    }
  }, [
    autoMixOn,
    plannedTransition,
    deckA.position,
    deckA.isPlaying,
    deckB.isPlaying,
    trackA,
    trackB,
    patchDeck,
    setCrossfader,
  ]);

  return (
    <div className="flex h-screen flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-bg-panel px-4 py-3">
        <div className="flex items-center gap-6">
          <Logo />
          <span className="text-xs text-text-mute">/ DJ Console</span>
        </div>
        <div className="flex items-center gap-3">
          {!seededRef.current && library.length === 0 && (
            <Button variant="primary" size="sm" onClick={seedLibrary}>
              Load starter tracks
            </Button>
          )}
          <Link href="/studio">
            <Button variant="outline" size="sm">
              <Music2 className="h-4 w-4" /> Studio
            </Button>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        {/* Library */}
        <div className="w-64 shrink-0 overflow-hidden">
          <Library
            tracks={library}
            loadedA={deckA.trackId}
            loadedB={deckB.trackId}
            onLoadDeck={loadDeck}
            onUpload={handleUpload}
          />
        </div>

        {/* Decks + Mixer */}
        <div className="flex flex-1 items-start gap-3 overflow-y-auto">
          <div className="min-w-0 flex-1">
            <Deck
              side="A"
              deck={deckA}
              track={trackA}
              accent="#a855f7"
              onTogglePlay={() => handleDeckTogglePlay("A")}
              onCue={() => handleDeckCue("A")}
              onSeek={(s) => handleDeckSeek("A", s)}
              onRate={(v) => patchDeck("A", { rate: v })}
              onEq={(b, v) => handleEq("A", b, v)}
              onFilter={(v) => patchDeck("A", { filter: v })}
              onVolume={(v) => patchDeck("A", { volume: v })}
              onResetEq={() => resetDeckEqStore("A")}
            />
          </div>
          <div className="w-28 shrink-0">
            <Mixer
              crossfader={crossfader}
              masterVolume={masterVolume}
              onCrossfader={setCrossfader}
              onMasterVolume={setMasterVolume}
            />
          </div>
          <div className="min-w-0 flex-1">
            <Deck
              side="B"
              deck={deckB}
              track={trackB}
              accent="#22d3ee"
              onTogglePlay={() => handleDeckTogglePlay("B")}
              onCue={() => handleDeckCue("B")}
              onSeek={(s) => handleDeckSeek("B", s)}
              onRate={(v) => patchDeck("B", { rate: v })}
              onEq={(b, v) => handleEq("B", b, v)}
              onFilter={(v) => patchDeck("B", { filter: v })}
              onVolume={(v) => patchDeck("B", { volume: v })}
              onResetEq={() => resetDeckEqStore("B")}
            />
          </div>
        </div>

        {/* Auto-mix panel */}
        <div className="w-72 shrink-0 overflow-y-auto">
          <AutoMixPanel
            enabled={autoMixOn}
            onToggle={setAutoMix}
            onPlanTransition={planTransition}
            onAutoSetlist={autoSetlist}
            busy={busy}
            plan={plannedTransition}
            canPlan={!!trackA && !!trackB}
            log={log}
          />
        </div>
      </div>
    </div>
  );
}
