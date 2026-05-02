"use client";

import { Volume2 } from "lucide-react";
import { Fader } from "@/components/ui/Fader";

interface Props {
  crossfader: number;
  masterVolume: number;
  onCrossfader: (v: number) => void;
  onMasterVolume: (v: number) => void;
}

export function Mixer({
  crossfader,
  masterVolume,
  onCrossfader,
  onMasterVolume,
}: Props) {
  return (
    <section className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg-panel p-4">
      <header className="text-[10px] uppercase tracking-widest text-text-mute">
        MIXER
      </header>

      <Fader
        label="MASTER"
        value={masterVolume}
        onChange={onMasterVolume}
        min={0}
        max={1}
        step={0.01}
        height={140}
        color="#a855f7"
        display={(v) => `${Math.round(v * 100)}`}
        onDoubleClick={() => onMasterVolume(0.85)}
      />

      <div className="mt-2 flex h-1 w-full items-center justify-between text-[10px] font-mono text-text-mute">
        <span style={{ color: "#a855f7" }}>A</span>
        <span>XF</span>
        <span style={{ color: "#22d3ee" }}>B</span>
      </div>

      <input
        type="range"
        min={-1}
        max={1}
        step={0.001}
        value={crossfader}
        onChange={(e) => onCrossfader(Number(e.target.value))}
        onDoubleClick={() => onCrossfader(0)}
        className="w-full"
        aria-label="Crossfader"
      />

      <div className="flex items-center gap-2 text-[10px] text-text-mute">
        <Volume2 className="h-3 w-3" />
        <span>{Math.round(masterVolume * 100)}%</span>
      </div>
    </section>
  );
}
