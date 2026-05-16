"use client";

import { useState } from "react";
import { Wand2, Layers, Sparkles, Volume2, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "@/lib/util";
import { MUSIC_GENRES } from "@/lib/music/genres";
import { PublishPanel } from "@/components/studio/PublishPanel";

type Tab = "generate" | "stems" | "master" | "publish";

interface Props {
  selectedTrackName: string | null;
  /** Genre id for generation (`src/lib/music/genres.ts`) */
  selectedGenreId: string;
  hasSelectedBuffer: boolean;
  onGenerate: (
    prompt: string,
    durationSec: number,
    genreId: string,
  ) => Promise<void>;
  onSeparateStems: () => Promise<void>;
  onMaster: (opts: { brightness: number; punch: number }) => Promise<void>;
  getSelectedWavBlob: () => Promise<Blob | null>;
  getSelectedAudioBuffer: () => AudioBuffer | null;
  logLines: string[];
  appendLog: (message: string) => void;
}

export function AIPanel({
  selectedTrackName,
  selectedGenreId,
  hasSelectedBuffer,
  onGenerate,
  onSeparateStems,
  onMaster,
  getSelectedWavBlob,
  getSelectedAudioBuffer,
  logLines,
  appendLog,
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

  const tabs: { id: Tab; label: string; icon: typeof Wand2 }[] = [
    { id: "generate", label: "Generate", icon: Wand2 },
    { id: "stems", label: "Stems", icon: Layers },
    { id: "master", label: "Master", icon: Volume2 },
    { id: "publish", label: "Publish", icon: Share2 },
  ];

  return (
    <aside className="relative flex h-full w-[min(100vw,21rem)] shrink-0 flex-col border-l border-line/80 bg-bg-panel/85 backdrop-blur-md md:w-80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/25 to-transparent" />

      <div className="border-b border-line/70 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-inner ring-1 ring-accent/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight text-text">
              AI Co-Pilot
            </div>
            <div className="mt-0.5 text-[11px] text-text-mute">Magic Studio</div>
            <div className="mt-1 truncate text-[10px] text-accent-cyan/90">
              {selectedTrackName ? `Target: ${selectedTrackName}` : "No track selected"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 gap-1 border-b border-line/70 p-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] font-semibold uppercase tracking-wide transition sm:text-[11px]",
                tab === id
                  ? "bg-accent/15 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-accent/35"
                  : "text-text-mute hover:bg-bg-raised/60 hover:text-text",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
          <div className="rounded-xl border border-line/60 bg-bg-deep/40 p-3 shadow-inner">
            {tab === "generate" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                    Genre catalogue
                  </label>
                  <p className="mt-0.5 text-[10px] text-text-mute">
                    Applies to the selected track when you generate.
                  </p>
                  <select
                    disabled
                    value={selectedGenreId}
                    className="mt-1 w-full rounded-lg border border-line/80 bg-bg-deep/60 px-2 py-1.5 text-xs text-text-dim"
                    title="Change genre in the track lane header"
                  >
                    {MUSIC_GENRES.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="mt-1 w-full resize-none rounded-lg border border-line/80 bg-bg-deep p-2.5 text-sm leading-snug text-text outline-none transition placeholder:text-text-mute focus:border-accent/50"
                    placeholder="Describe your loop…"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                      Duration
                    </label>
                    <span className="font-mono text-[11px] tabular-nums text-accent">
                      {duration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={30}
                    step={1}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="studio-master-slider mt-2 h-1 w-full"
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full shadow-glow"
                  disabled={busy || !prompt.trim()}
                  onClick={() =>
                    run(() => onGenerate(prompt.trim(), duration, selectedGenreId))
                  }
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
                  cinematic pad&rdquo;, or &ldquo;dnb breakbeat&rdquo;. The mock engine uses the
                  catalogue genre plus words in your prompt for BPM and feel.
                </p>
              </div>
            )}

            {tab === "stems" && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-text-dim">
                  Split the selected track into{" "}
                  <span className="text-accent-pink">vocals</span>,{" "}
                  <span className="text-accent-amber">drums</span>,{" "}
                  <span className="text-accent-green">bass</span>, and{" "}
                  <span className="text-accent-cyan">other</span>. Each stem becomes a new track.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full shadow-glow"
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
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                    Brightness: {brightness > 0 ? "+" : ""}{(brightness * 6).toFixed(1)} dB tilt
                  </label>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="studio-master-slider mt-2 h-1 w-full"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                    Punch: {(punch * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={punch}
                    onChange={(e) => setPunch(Number(e.target.value))}
                    className="studio-master-slider mt-2 h-1 w-full"
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full shadow-glow"
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

            {tab === "publish" && (
              <PublishPanel
                selectedTrackName={selectedTrackName}
                selectedGenreId={selectedGenreId}
                hasSelectedBuffer={hasSelectedBuffer}
                getSelectedAudioBuffer={getSelectedAudioBuffer}
                getSelectedWavBlob={getSelectedWavBlob}
                log={appendLog}
              />
            )}
          </div>

          {logLines.length > 0 && (
            <div className="mt-4 rounded-xl border border-line/60 bg-bg-deep/35 p-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-mute">
                Activity
              </div>
              <ul className="max-h-[min(40vh,280px)] space-y-1.5 overflow-y-auto text-[11px] leading-snug text-text-dim">
                {logLines.slice(-14).reverse().map((l, i) => (
                  <li key={i} className="border-l-2 border-accent/25 pl-2 font-mono">
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
