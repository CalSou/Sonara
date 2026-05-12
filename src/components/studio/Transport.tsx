"use client";

import { Play, Pause, Square, SkipBack, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fmtTime } from "@/lib/util";

interface Props {
  isPlaying: boolean;
  position: number;
  duration: number;
  bpm: number;
  masterVolume: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onRewind: () => void;
  onBpmChange: (v: number) => void;
  onMasterVolumeChange: (v: number) => void;
}

export function Transport({
  isPlaying,
  position,
  duration,
  bpm,
  masterVolume,
  onTogglePlay,
  onStop,
  onRewind,
  onBpmChange,
  onMasterVolumeChange,
}: Props) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-line/80 bg-bg-panel/70 px-4 py-3 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />

      <div className="flex items-center gap-2">
        <Button variant="subtle" size="md" onClick={onRewind} aria-label="Rewind">
          <SkipBack className="h-4 w-4" />
        </Button>
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-glow ring-2 ring-accent/30 transition hover:bg-accent/90 hover:ring-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 fill-current" />
          ) : (
            <Play className="h-5 w-5 translate-x-px fill-current" />
          )}
        </button>
        <Button variant="subtle" size="md" onClick={onStop} aria-label="Stop">
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-2">
        <div className="font-mono text-sm tabular-nums tracking-tight">
          <span className="text-accent">{fmtTime(position)}</span>
          <span className="mx-2 text-text-mute">/</span>
          <span className="text-text-dim">{fmtTime(duration)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
            BPM
          </span>
          <input
            type="number"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value) || 120)}
            className="h-8 w-14 rounded-lg border border-line bg-bg-deep px-2 text-center font-mono text-xs tabular-nums text-text outline-none transition focus:border-accent/60"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Volume2 className="h-4 w-4 shrink-0 text-text-mute" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
          className="studio-master-slider h-1 w-32 md:w-36"
          aria-label="Master volume"
        />
      </div>
    </div>
  );
}
