"use client";

import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { TransitionPlan } from "@/lib/ai/types";
import { clsx } from "@/lib/util";

interface Props {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  onPlanTransition: () => void;
  onAutoSetlist: () => void;
  busy: boolean;
  plan: TransitionPlan | null;
  canPlan: boolean;
  log: string[];
}

export function AutoMixPanel({
  enabled,
  onToggle,
  onPlanTransition,
  onAutoSetlist,
  busy,
  plan,
  canPlan,
  log,
}: Props) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-bg-panel p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 text-accent">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-sm font-semibold">Auto-Mix</div>
            <div className="text-[10px] text-text-mute">AI co-pilot for the booth</div>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={clsx(
            "relative h-6 w-11 rounded-full transition-colors",
            enabled ? "bg-accent" : "bg-bg-raised border border-line",
          )}
          aria-pressed={enabled}
          aria-label="Toggle Auto-Mix"
        >
          <span
            className={clsx(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              enabled ? "translate-x-5" : "translate-x-0.5",
            )}
          />
        </button>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="subtle"
          size="sm"
          onClick={onPlanTransition}
          disabled={busy || !canPlan}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          Plan A→B
        </Button>
        <Button
          variant="subtle"
          size="sm"
          onClick={onAutoSetlist}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Auto-setlist
        </Button>
      </div>

      {plan && (
        <div className="rounded-md border border-accent/30 bg-accent/5 p-3 text-xs">
          <div className="mb-1 flex items-center gap-1.5 font-semibold text-accent">
            <Sparkles className="h-3 w-3" /> Transition Plan
          </div>
          <ul className="space-y-1 text-text-dim">
            {plan.notes.map((n, i) => (
              <li key={i}>· {n}</li>
            ))}
            <li className="mt-1 font-mono text-[10px] text-text-mute">
              start@{plan.startInToSec}s · {plan.crossfadeDurationSec}s blend · rate ×{plan.bpmAdjustment.toFixed(3)}
            </li>
          </ul>
        </div>
      )}

      {log.length > 0 && (
        <div className="border-t border-line pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-text-mute">
            Activity
          </div>
          <ul className="max-h-40 space-y-1 overflow-y-auto text-[11px] font-mono text-text-dim">
            {log.slice(-12).reverse().map((l, i) => (
              <li key={i} className="leading-snug">{l}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
