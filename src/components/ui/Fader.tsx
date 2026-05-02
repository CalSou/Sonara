"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/util";

interface Props {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  height?: number;
  bipolar?: boolean;
  color?: string;
  label?: string;
  display?: (v: number) => string;
  onDoubleClick?: () => void;
}

export function Fader({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.001,
  height = 160,
  bipolar = false,
  color = "#22d3ee",
  label,
  display,
  onDoubleClick,
}: Props) {
  const [drag, setDrag] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(value);
  const range = max - min;

  const onMove = useCallback(
    (e: PointerEvent) => {
      const dy = startY.current - e.clientY;
      const sens = e.shiftKey ? 0.3 : 1;
      const next = Math.max(min, Math.min(max, startVal.current + (dy / height) * range * sens));
      onChange(Math.round(next / step) * step);
    },
    [height, max, min, onChange, range, step],
  );

  useEffect(() => {
    if (!drag) return;
    const up = () => setDrag(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, onMove]);

  const ratio = (value - min) / range;
  const knobY = (1 - ratio) * (height - 16);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className={clsx(
          "relative w-6 rounded-md border border-line bg-bg-deep",
          drag && "ring-1 ring-accent",
        )}
        style={{ height }}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as Element).setPointerCapture?.(e.pointerId);
          startY.current = e.clientY;
          startVal.current = value;
          setDrag(true);
        }}
        onDoubleClick={onDoubleClick}
      >
        {bipolar && (
          <div
            className="absolute inset-x-0 top-1/2 h-px"
            style={{ background: "#3a3a4a" }}
          />
        )}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-sm"
          style={{
            top: knobY,
            width: 18,
            height: 16,
            background: `linear-gradient(180deg, #2a2a36, #1a1a24)`,
            border: `1px solid ${color}`,
            boxShadow: `0 0 8px -2px ${color}`,
          }}
        />
      </div>
      {label && (
        <div className="text-[10px] uppercase tracking-wider text-text-mute">
          {label}
        </div>
      )}
      {display && (
        <div className="font-mono text-[10px] text-text-dim">
          {display(value)}
        </div>
      )}
    </div>
  );
}
