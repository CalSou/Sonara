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
    <div className="flex items-center justify-between gap-4 border-b border-line bg-bg-panel px-4 py-3">
      <div className="flex items-center gap-2">
        <Button variant="subtle" size="md" onClick={onRewind} aria-label="Rewind">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={onTogglePlay}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Button variant="subtle" size="md" onClick={onStop} aria-label="Stop">
          <Square className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center gap-6 text-text-dim">
        <div className="font-mono text-sm">
          <span className="text-text">{fmtTime(position)}</span>
          <span className="mx-2 text-text-mute">/</span>
          <span>{fmtTime(duration)}</span>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <span className="text-[10px] uppercase tracking-wider text-text-mute">BPM</span>
          <input
            type="number"
            min={40}
            max={220}
            value={bpm}
            onChange={(e) => onBpmChange(Number(e.target.value) || 120)}
            className="h-7 w-14 rounded border border-line bg-bg-deep px-2 font-mono text-xs text-text"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-text-mute" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
          className="w-28"
          aria-label="Master volume"
        />
      </div>
    </div>
  );
}
