"use client";

import { Play, Pause, RotateCcw, MapPin } from "lucide-react";
import { Waveform } from "@/components/ui/Waveform";
import { Knob } from "@/components/ui/Knob";
import { Fader } from "@/components/ui/Fader";
import { Button } from "@/components/ui/Button";
import { clsx, fmtTime } from "@/lib/util";
import type { DeckId, DeckState } from "@/lib/store/djStore";
import type { LibraryTrack } from "@/lib/store/djStore";

interface Props {
  side: DeckId;
  deck: DeckState;
  track: LibraryTrack | null;
  accent: string;
  onTogglePlay: () => void;
  onCue: () => void;
  onSeek: (sec: number) => void;
  onRate: (v: number) => void;
  onEq: (band: "low" | "mid" | "high", v: number) => void;
  onFilter: (v: number) => void;
  onVolume: (v: number) => void;
  onResetEq: () => void;
}

export function Deck({
  side,
  deck,
  track,
  accent,
  onTogglePlay,
  onCue,
  onSeek,
  onRate,
  onEq,
  onFilter,
  onVolume,
  onResetEq,
}: Props) {
  const dur = track?.analysis.durationSec ?? 0;
  const progress = dur > 0 ? Math.min(1, deck.position / dur) : 0;
  const liveBpm = track ? track.analysis.bpm * deck.rate : 0;
  const pitchPct = (deck.rate - 1) * 100;

  return (
    <section
      className={clsx(
        "flex flex-col gap-3 rounded-xl border bg-bg-panel p-4",
        "border-line",
      )}
      style={{ boxShadow: `inset 0 0 0 1px ${accent}22` }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md font-mono text-sm font-bold"
            style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
          >
            {side}
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {track ? track.name : "(empty deck)"}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-text-mute">
              {track ? `${track.analysis.keyCamelot} · ${track.analysis.keyMusical}` : "Drop a track"}
            </div>
          </div>
        </div>
        <div className="text-right font-mono text-[11px] text-text-dim">
          <div>
            <span className="text-text">{liveBpm.toFixed(1)}</span>
            <span className="text-text-mute"> BPM</span>
          </div>
          <div>
            <span className={pitchPct === 0 ? "text-text-mute" : pitchPct > 0 ? "text-accent-cyan" : "text-accent"}>
              {pitchPct > 0 ? "+" : ""}{pitchPct.toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      <div className="rounded-md border border-line bg-bg-deep p-2">
        <Waveform
          peaks={track?.peaks ?? null}
          progress={progress}
          height={72}
          color={accent}
          progressColor="#ffffff"
          hot={deck.isPlaying}
          onSeek={(r) => onSeek(r * dur)}
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-text-mute">
          <span>{fmtTime(deck.position)}</span>
          <span>-{fmtTime(Math.max(0, dur - deck.position))}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={onTogglePlay}
          disabled={!track}
        >
          {deck.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {deck.isPlaying ? "Pause" : "Play"}
        </Button>
        <Button variant="subtle" size="md" onClick={onCue} disabled={!track}>
          <MapPin className="h-4 w-4" />
          Cue
        </Button>
        <Button
          variant="ghost"
          size="md"
          onClick={onResetEq}
          aria-label="Reset EQ & filter"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-start gap-3">
        <div className="flex flex-1 items-start justify-around gap-1 rounded-md border border-line bg-bg-deep/50 px-2 py-3">
          <Knob
            label="HIGH"
            size={44}
            value={deck.eqHigh}
            onChange={(v) => onEq("high", v)}
            min={-24}
            max={12}
            step={0.5}
            bipolar
            color={accent}
            display={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
            onDoubleClick={() => onEq("high", 0)}
          />
          <Knob
            label="MID"
            size={44}
            value={deck.eqMid}
            onChange={(v) => onEq("mid", v)}
            min={-24}
            max={12}
            step={0.5}
            bipolar
            color={accent}
            display={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
            onDoubleClick={() => onEq("mid", 0)}
          />
          <Knob
            label="LOW"
            size={44}
            value={deck.eqLow}
            onChange={(v) => onEq("low", v)}
            min={-24}
            max={12}
            step={0.5}
            bipolar
            color={accent}
            display={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
            onDoubleClick={() => onEq("low", 0)}
          />
          <Knob
            label="FILT"
            size={44}
            value={deck.filter}
            onChange={onFilter}
            min={-1}
            max={1}
            step={0.01}
            bipolar
            color={accent}
            display={(v) =>
              v === 0 ? "off" : v > 0 ? `HP${(v * 100).toFixed(0)}` : `LP${(-v * 100).toFixed(0)}`
            }
            onDoubleClick={() => onFilter(0)}
          />
        </div>

        <div className="flex shrink-0 items-start gap-2 rounded-md border border-line bg-bg-deep/50 px-2 py-3">
          <Fader
            label="PITCH"
            value={deck.rate}
            onChange={onRate}
            min={0.92}
            max={1.08}
            step={0.0005}
            height={100}
            bipolar
            color={accent}
            display={(v) => `${((v - 1) * 100).toFixed(1)}%`}
            onDoubleClick={() => onRate(1)}
          />
          <Fader
            label="VOL"
            value={deck.volume}
            onChange={onVolume}
            min={0}
            max={1}
            step={0.01}
            height={100}
            color={accent}
            display={(v) => `${Math.round(v * 100)}`}
            onDoubleClick={() => onVolume(0.85)}
          />
        </div>
      </div>
    </section>
  );
}
