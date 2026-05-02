"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/util";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: number;
  label?: string;
  display?: (v: number) => string;
  bipolar?: boolean;
  color?: string;
  onDoubleClick?: () => void;
}

/** Drag-vertical knob. */
export function Knob({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.001,
  size = 56,
  label,
  display,
  bipolar = false,
  color = "#a855f7",
  onDoubleClick,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);
  const range = max - min;

  const onMove = useCallback(
    (e: PointerEvent) => {
      const dy = startY.current - e.clientY;
      const sens = e.shiftKey ? 0.0015 : 0.005;
      let next = startVal.current + dy * range * sens;
      next = Math.round(next / step) * step;
      next = Math.max(min, Math.min(max, next));
      onChange(next);
    },
    [max, min, onChange, range, step],
  );

  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", up);
    };
  }, [dragging, onMove]);

  const ratio = (value - min) / range;
  const arcStart = bipolar ? -90 : -135;
  const arcEnd = bipolar ? -90 + (ratio - 0.5) * 270 : -135 + ratio * 270;
  const a1 = (Math.min(arcStart, arcEnd) * Math.PI) / 180;
  const a2 = (Math.max(arcStart, arcEnd) * Math.PI) / 180;

  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const trackPath = describeArc(cx, cy, r, -135, 135);
  const valPath = describeArc(cx, cy, r, (a1 * 180) / Math.PI, (a2 * 180) / Math.PI);
  const indicatorAngle = (-135 + ratio * 270) * (Math.PI / 180);
  const ix = cx + Math.cos(indicatorAngle) * (r - 4);
  const iy = cy + Math.sin(indicatorAngle) * (r - 4);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        width={size}
        height={size}
        className={clsx("cursor-ns-resize", dragging && "opacity-90")}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          startY.current = e.clientY;
          startVal.current = value;
          setDragging(true);
        }}
        onDoubleClick={onDoubleClick}
      >
        <circle cx={cx} cy={cy} r={r + 4} fill="#0f0f17" stroke="#23232f" />
        <path d={trackPath} stroke="#23232f" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d={valPath} stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={ix} y2={iy} stroke="#e5e7eb" strokeWidth={2} strokeLinecap="round" />
      </svg>
      <div className="text-[10px] uppercase tracking-wider text-text-mute">{label}</div>
      <div className="font-mono text-[10px] text-text-dim">
        {display ? display(value) : value.toFixed(2)}
      </div>
    </div>
  );
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}
