"use client";

import { useState } from "react";
import { Wand2, Layers, Sparkles, Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";

type Tab = "generate" | "stems" | "master";

interface Props {
  selectedTrackName: string | null;
  hasSelectedBuffer: boolean;
  onGenerate: (prompt: string, durationSec: number) => Promise<void>;
  onSeparateStems: () => Promise<void>;
  onMaster: (opts: { brightness: number; punch: number }) => Promise<void>;
  log: string[];
}

export function AIPanel({
  selectedTrackName,
  hasSelectedBuffer,
  onGenerate,
  onSeparateStems,
  onMaster,
  log,
}: Props) {
  const [tab, setTab] = useState<Tab>("generate");
  const [prompt, setPrompt] = useState("warm lofi beat with vinyl crackle");
  const [duration, setDuration] = useState(8);
  const [brightness, setBrightness] = useState(0.2);
  const [punch, setPunch] = useState(0.5);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-line bg-bg-panel">
      <div className="flex items-center justify-between border-b border-line p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">AI Co-Pilot</div>
            <div className="text-[10px] text-text-mute">
              {selectedTrackName ? `Target: ${selectedTrackName}` : "No track selected"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-line">
        {(["generate", "stems", "master"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex-1 border-b-2 px-3 py-2 text-xs font-medium capitalize transition",
              tab === t
                ? "border-accent text-text"
                : "border-transparent text-text-mute hover:text-text",
            )}
          >
            {t === "generate" && <Wand2 className="mr-1 inline h-3 w-3" />}
            {t === "stems" && <Layers className="mr-1 inline h-3 w-3" />}
            {t === "master" && <Volume2 className="mr-1 inline h-3 w-3" />}
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "generate" && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-mute">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                className="mt-1 w-full resize-none rounded-md border border-line bg-bg-deep p-2 text-sm text-text outline-none focus:border-accent/60"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-mute">
                Duration: {duration}s
              </label>
              <input
                type="range"
                min={2}
                max={30}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={busy || !prompt.trim()}
              onClick={() => run(() => onGenerate(prompt.trim(), duration))}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {busy ? "Generating…" : "Generate to track"}
            </Button>
            <p className="text-[11px] leading-relaxed text-text-mute">
              Try prompts like &ldquo;driving techno 132 BPM&rdquo;, &ldquo;ambient
              cinematic pad&rdquo;, or &ldquo;dnb breakbeat&rdquo;. The mock
              engine infers BPM &amp; key from your prompt.
            </p>
          </div>
        )}

        {tab === "stems" && (
          <div className="space-y-3">
            <p className="text-xs text-text-dim">
              Split the selected track into <span className="text-text">vocals</span>,{" "}
              <span className="text-text">drums</span>, <span className="text-text">bass</span> and{" "}
              <span className="text-text">other</span>. Each stem becomes a new track.
            </p>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={busy || !hasSelectedBuffer}
              onClick={() => run(() => onSeparateStems())}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
              {busy ? "Separating…" : "Separate stems"}
            </Button>
            {!hasSelectedBuffer && (
              <p className="text-[11px] text-text-mute">
                Select a track that has audio loaded.
              </p>
            )}
          </div>
        )}

        {tab === "master" && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-mute">
                Brightness: {brightness > 0 ? "+" : ""}{(brightness * 6).toFixed(1)} dB tilt
              </label>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-text-mute">
                Punch: {(punch * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={punch}
                onChange={(e) => setPunch(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full"
              disabled={busy || !hasSelectedBuffer}
              onClick={() => run(() => onMaster({ brightness, punch }))}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              {busy ? "Mastering…" : "Master selected track"}
            </Button>
            {!hasSelectedBuffer && (
              <p className="text-[11px] text-text-mute">
                Select a track with audio first.
              </p>
            )}
          </div>
        )}

        {log.length > 0 && (
          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-2 text-[10px] uppercase tracking-wider text-text-mute">
              Activity
            </div>
            <ul className="space-y-1 text-xs text-text-dim">
              {log.slice(-12).reverse().map((l, i) => (
                <li key={i} className="font-mono leading-snug">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
}
