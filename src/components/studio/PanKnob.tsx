"use client";

import { useId } from "react";

interface Props {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}

/** Compact rotary pan control (−1..1); drag vertically + Arrow keys */
export function PanKnob({ value, onChange, label = "Pan" }: Props) {
  const fid = useId().replace(/:/g, "");
  const filterId = `knobGlow-${fid}`;
  const angleDeg = value * 60;

  return (
    <div className="flex flex-col items-center gap-0.5 select-none">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-text-mute">
        {label}
      </span>
      <button
        type="button"
        className="relative flex h-8 w-8 cursor-ns-resize touch-none items-center justify-center rounded-full border border-line bg-bg-deep outline-none ring-accent/0 transition hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={label}
        onPointerDown={(e) => {
          const sy = e.clientY;
          const sv = value;
          const move = (ev: PointerEvent) => {
            const dy = sy - ev.clientY;
            onChange(Math.max(-1, Math.min(1, sv + dy * 0.012)));
          };
          const up = () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
          };
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", up);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(-1, value - 0.08));
          }
          if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(1, value + 0.08));
          }
        }}
      >
        <span className="pointer-events-none absolute inset-[14%] rounded-full bg-bg-raised/60 ring-1 ring-white/[0.06]" />
        <svg
          className="pointer-events-none relative h-full w-full p-[22%]"
          viewBox="0 0 32 32"
          aria-hidden
        >
          <circle cx={16} cy={16} r={11} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <line
            x1={16}
            y1={16}
            x2={16}
            y2={8}
            stroke="#a855f7"
            strokeWidth={2}
            strokeLinecap="round"
            filter={`url(#${filterId})`}
            transform={`rotate(${angleDeg} 16 16)`}
          />
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation={1.2} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
        <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-mono tabular-nums text-text-mute">
          {Math.abs(value) < 0.06 ? "C" : value > 0 ? "R" : "L"}
        </span>
      </button>
    </div>
  );
}
