"use client";

import {
  Volume2,
  VolumeX,
  Headphones,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useRef } from "react";
import { Waveform } from "@/components/ui/Waveform";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";
import type { StudioTrack } from "@/lib/store/studioStore";

interface Props {
  track: StudioTrack;
  selected: boolean;
  position: number;
  duration: number;
  onSelect: () => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  onGenerate: () => void;
  onSeek: (sec: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolume: (v: number) => void;
  onPan: (v: number) => void;
  onRename: (name: string) => void;
}

export function TrackLane({
  track,
  selected,
  position,
  duration,
  onSelect,
  onRemove,
  onUpload,
  onGenerate,
  onSeek,
  onToggleMute,
  onToggleSolo,
  onVolume,
  onPan,
  onRename,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const trackDur = track.buffer?.duration ?? 0;
  // Render progress relative to the timeline (the full multitrack duration)
  const progressNorm = duration > 0 ? Math.min(1, position / duration) : 0;
  // Width fraction this track occupies on the timeline
  const widthPct = duration > 0 ? Math.min(100, (trackDur / duration) * 100) : 100;

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "group flex border-b border-line bg-bg-panel transition-colors hover:bg-bg-raised/40",
        selected && "bg-bg-raised/60",
      )}
    >
      {/* Header column */}
      <div
        className="flex w-56 shrink-0 flex-col gap-2 border-r border-line p-3"
        style={{ borderLeft: `3px solid ${track.color}` }}
      >
        <div className="flex items-center justify-between gap-2">
          <input
            value={track.name}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none focus:bg-bg-deep focus:px-1 focus:rounded"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="opacity-0 transition group-hover:opacity-100"
            aria-label="Remove track"
          >
            <Trash2 className="h-3.5 w-3.5 text-text-mute hover:text-red-400" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={clsx(
              "inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold",
              track.mute
                ? "bg-red-500/20 text-red-300"
                : "border border-line text-text-mute hover:text-text",
            )}
            aria-label="Mute"
          >
            M
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={clsx(
              "inline-flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold",
              track.solo
                ? "bg-amber-500/20 text-amber-300"
                : "border border-line text-text-mute hover:text-text",
            )}
            aria-label="Solo"
          >
            S
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={track.volume}
            onChange={(e) => {
              onVolume(Number(e.target.value));
            }}
            onClick={(e) => e.stopPropagation()}
            className="ml-1 flex-1"
            aria-label="Volume"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-text-mute">Pan</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={track.pan}
            onChange={(e) => onPan(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="flex-1"
            aria-label="Pan"
          />
        </div>
      </div>

      {/* Waveform area */}
      <div className="relative flex-1 p-2">
        {track.buffer ? (
          <div style={{ width: `${widthPct}%` }}>
            <Waveform
              peaks={track.peaks}
              progress={trackDur > 0 ? Math.min(1, position / trackDur) : 0}
              height={64}
              color={track.color}
              progressColor={track.color}
              hot={false}
              onSeek={(r) => onSeek(r * trackDur)}
            />
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center gap-2 rounded border border-dashed border-line text-xs text-text-mute">
            <Button
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
            >
              <Upload className="h-3.5 w-3.5" /> Upload audio
            </Button>
            <span className="text-text-mute">or</span>
            <Button
              variant="subtle"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
            >
              <Wand2 className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        )}
        {/* Hidden timeline progress overlay for empty tracks */}
        {!track.buffer && duration > 0 && (
          <div
            className="pointer-events-none absolute left-2 top-1/2 h-px w-[calc(100%-1rem)] -translate-y-1/2"
          >
            <div
              className="absolute top-1/2 h-12 w-px -translate-y-1/2 bg-white/40"
              style={{ left: `${progressNorm * 100}%` }}
            />
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
