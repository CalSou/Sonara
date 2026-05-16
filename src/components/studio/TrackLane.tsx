"use client";

import {
  Volume2,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { useRef } from "react";
import { Waveform } from "@/components/ui/Waveform";
import { Button } from "@/components/ui/Button";
import { PanKnob } from "@/components/studio/PanKnob";
import { clsx } from "@/lib/util";
import { DEFAULT_GENRE_ID, MUSIC_GENRES } from "@/lib/music/genres";
import type { StudioTrack } from "@/lib/store/studioStore";

interface Props {
  track: StudioTrack;
  selected: boolean;
  position: number;
  duration: number;
  /** 0..1 playhead across the shared timeline */
  timelineProgress: number;
  isTimelinePlaying: boolean;
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
  onGenreChange: (genreId: string) => void;
}

export function TrackLane({
  track,
  selected,
  position,
  duration,
  timelineProgress,
  isTimelinePlaying,
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
  onGenreChange,
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const trackDur = track.buffer?.duration ?? 0;
  const progressNorm =
    trackDur > 0 ? Math.min(1, position / trackDur) : 0;
  const widthPct = duration > 0 ? Math.min(100, (trackDur / duration) * 100) : 100;
  const isHot = selected && isTimelinePlaying;

  return (
    <div
      onClick={onSelect}
      className={clsx(
        "group flex min-h-[96px] border-b border-line/70 bg-bg-panel/30 transition-colors hover:bg-bg-raised/25",
        selected && "bg-accent/[0.06] ring-1 ring-inset ring-accent/20",
      )}
    >
      {/* Track header (mock-style strip) */}
      <div
        className="flex w-[min(220px,32vw)] shrink-0 flex-col justify-center gap-2.5 border-r border-line/70 bg-bg-deep/40 p-3"
        style={{ borderLeftWidth: 4, borderLeftColor: track.color }}
      >
        <div className="flex items-center justify-between gap-2">
          <input
            value={track.name}
            onChange={(e) => onRename(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 truncate bg-transparent text-sm font-semibold tracking-tight text-text outline-none placeholder:text-text-mute focus:ring-0"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="shrink-0 rounded p-1 opacity-0 transition hover:bg-bg-raised group-hover:opacity-100"
            aria-label="Remove track"
          >
            <Trash2 className="h-3.5 w-3.5 text-text-mute hover:text-red-400" />
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-text-mute">
            Genre
          </span>
          <select
            value={
              MUSIC_GENRES.some((g) => g.id === track.genreId)
                ? track.genreId
                : DEFAULT_GENRE_ID
            }
            onChange={(e) => {
              e.stopPropagation();
              onGenreChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg border border-line/80 bg-bg-deep px-2 py-1 text-[11px] text-text outline-none focus:border-accent/50"
          >
            {MUSIC_GENRES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className={clsx(
              "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition",
              track.mute
                ? "bg-red-500/25 text-red-200 ring-1 ring-red-400/40"
                : "border border-line/80 bg-bg-deep/60 text-text-mute hover:border-text-mute hover:text-text",
            )}
            aria-label="Mute"
            aria-pressed={track.mute}
          >
            M
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSolo();
            }}
            className={clsx(
              "inline-flex min-w-[2rem] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition",
              track.solo
                ? "bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40"
                : "border border-line/80 bg-bg-deep/60 text-text-mute hover:border-text-mute hover:text-text",
            )}
            aria-label="Solo"
            aria-pressed={track.solo}
          >
            S
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Volume2 className="h-3 w-3 shrink-0 text-text-mute" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={track.volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="studio-vol-slider h-1 flex-1"
              aria-label="Volume"
            />
          </div>
        </div>

        <div className="flex items-center justify-center pt-0.5">
          <PanKnob value={track.pan} onChange={onPan} />
        </div>
      </div>

      {/* Waveform well + shared timeline playhead */}
      <div className="relative flex min-h-[96px] flex-1 items-stretch p-3">
        {track.buffer ? (
          <div className="relative w-full overflow-hidden rounded-xl border border-line/80 bg-[#06060c]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div style={{ width: `${widthPct}%` }} className="relative">
              <Waveform
                peaks={track.peaks}
                progress={progressNorm}
                height={72}
                color={track.color}
                progressColor="rgba(255,255,255,0.92)"
                bgColor="transparent"
                hot={isHot}
                showInnerPlayhead={false}
                onSeek={(r) => onSeek(r * trackDur)}
              />
            </div>
            {duration > 0 && (
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
              >
                <div
                  className="absolute top-2 bottom-2 w-px bg-white shadow-[0_0_14px_rgba(168,85,247,0.85)]"
                  style={{
                    left: `${timelineProgress * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line/70 bg-bg-deep/50 px-4 py-6 text-xs text-text-mute">
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
            <span className="text-text-mute/80">or</span>
            <Button
              variant="outline"
              size="sm"
              className="border-accent/40 text-accent hover:border-accent hover:bg-accent/10"
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
            >
              <Wand2 className="h-3.5 w-3.5" /> Generate
            </Button>
            {duration > 0 && (
              <div className="pointer-events-none absolute inset-0 rounded-xl">
                <div
                  className="absolute top-3 bottom-3 w-px bg-white/70 shadow-[0_0_10px_rgba(168,85,247,0.7)]"
                  style={{
                    left: `${timelineProgress * 100}%`,
                    transform: "translateX(-50%)",
                  }}
                />
              </div>
            )}
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
