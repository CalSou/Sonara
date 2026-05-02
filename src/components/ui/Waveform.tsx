"use client";

import { useEffect, useRef } from "react";

interface Props {
  peaks: number[] | null;
  progress: number; // 0..1
  height?: number;
  color?: string;
  progressColor?: string;
  bgColor?: string;
  onSeek?: (ratio: number) => void;
  hot?: boolean; // tint a "playing" highlight
}

/** Lightweight canvas waveform renderer. */
export function Waveform({
  peaks,
  progress,
  height = 64,
  color = "#a855f7",
  progressColor = "#22d3ee",
  bgColor = "transparent",
  onSeek,
  hot = false,
}: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = window.devicePixelRatio || 1;
    const w = wrap.clientWidth;
    const h = height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const g = canvas.getContext("2d");
    if (!g) return;
    g.scale(dpr, dpr);
    g.clearRect(0, 0, w, h);

    if (bgColor !== "transparent") {
      g.fillStyle = bgColor;
      g.fillRect(0, 0, w, h);
    }

    if (!peaks || peaks.length === 0) {
      g.fillStyle = "#23232f";
      g.fillRect(0, h / 2 - 0.5, w, 1);
      return;
    }

    const mid = h / 2;
    const cutoff = Math.floor(progress * w);
    const step = peaks.length / w;
    for (let x = 0; x < w; x++) {
      const idx = Math.floor(x * step);
      const v = peaks[idx] ?? 0;
      const y = Math.max(1, v * (h * 0.45));
      g.fillStyle = x < cutoff ? progressColor : color;
      g.globalAlpha = hot && x < cutoff ? 1 : 0.85;
      g.fillRect(x, mid - y, 1, y * 2);
    }
    g.globalAlpha = 1;

    // playhead
    if (cutoff > 0 && cutoff < w) {
      g.fillStyle = "#ffffff";
      g.fillRect(cutoff - 0.5, 0, 1, h);
    }
  }, [peaks, progress, height, color, progressColor, bgColor, hot]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ height }}
      onClick={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
      }}
    >
      <canvas ref={ref} className="block h-full w-full" />
    </div>
  );
}
