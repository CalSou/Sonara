"use client";

import { useRef } from "react";
import { Upload, Music } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";
import type { LibraryTrack } from "@/lib/store/djStore";

interface Props {
  tracks: LibraryTrack[];
  loadedA: string | null;
  loadedB: string | null;
  onLoadDeck: (deck: "A" | "B", id: string) => void;
  onUpload: (file: File) => void;
}

export function Library({ tracks, loadedA, loadedB, onLoadDeck, onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  return (
    <section className="flex h-full flex-col rounded-xl border border-line bg-bg-panel">
      <header className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <Music className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold tracking-wider">LIBRARY</span>
          <span className="text-[10px] text-text-mute">({tracks.length})</span>
        </div>
        <Button variant="subtle" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5" /> Add
        </Button>
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
      </header>

      <ul className="flex-1 overflow-y-auto py-1">
        {tracks.map((t) => {
          const onA = loadedA === t.id;
          const onB = loadedB === t.id;
          return (
            <li
              key={t.id}
              className="group flex items-center gap-3 px-3 py-2 hover:bg-bg-raised/60"
            >
              <div
                className="h-8 w-8 shrink-0 rounded-md"
                style={{
                  background: `linear-gradient(135deg, ${t.artwork}, ${t.artwork}33)`,
                  boxShadow: `inset 0 0 0 1px ${t.artwork}55`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="font-mono text-[10px] text-text-mute">
                  {t.analysis.bpm} BPM · {t.analysis.keyCamelot} · {Math.floor(t.analysis.durationSec)}s
                </div>
              </div>
              <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => onLoadDeck("A", t.id)}
                  className={clsx(
                    "h-7 w-7 rounded-md border text-xs font-bold",
                    onA ? "border-accent bg-accent/20 text-accent" : "border-line text-text-mute hover:border-accent hover:text-accent",
                  )}
                  aria-label="Load to A"
                >
                  A
                </button>
                <button
                  onClick={() => onLoadDeck("B", t.id)}
                  className={clsx(
                    "h-7 w-7 rounded-md border text-xs font-bold",
                    onB ? "border-accent-cyan bg-accent-cyan/20 text-accent-cyan" : "border-line text-text-mute hover:border-accent-cyan hover:text-accent-cyan",
                  )}
                  aria-label="Load to B"
                >
                  B
                </button>
              </div>
            </li>
          );
        })}
        {tracks.length === 0 && (
          <li className="p-6 text-center text-xs text-text-mute">
            Library is empty.
          </li>
        )}
      </ul>
    </section>
  );
}
