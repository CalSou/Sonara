"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Maximize2,
  X,
} from "lucide-react";

import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

type Screen = {
  id: string;
  title: string;
  caption: string;
  src: string;
  /** Aspect ratio width/height, used to size the frame */
  ratio: number;
};

const SCREENS: Screen[] = [
  {
    id: "landing",
    title: "01 — Landing",
    caption:
      "Hero with purple-glow tagline, Open Studio / Open DJ Console CTAs, two feature cards (Multitrack / Live).",
    src: "/design/01_landing.png",
    ratio: 16 / 9,
  },
  {
    id: "studio",
    title: "02 — Production Studio",
    caption:
      "Transport bar, 5 coloured track lanes with playhead, AI Co-Pilot panel (Generate / Stems / Master) and activity log.",
    src: "/design/02_studio.png",
    ratio: 16 / 9,
  },
  {
    id: "dj",
    title: "03 — DJ Console",
    caption:
      "Two decks (purple / cyan), central mixer with vertical faders + glowing crossfader, EQ + filter per deck, library with Load A/B and Auto-Mix plan.",
    src: "/design/03_dj.png",
    ratio: 16 / 9,
  },
  {
    id: "mobile",
    title: "04 — Mobile Studio + Register",
    caption:
      "Responsive Studio with a floating AI Co-Pilot sheet, plus the /register onboarding screen.",
    src: "/design/04_mobile_register.png",
    ratio: 16 / 9,
  },
];

export default function DesignPreviewPage() {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const screen = SCREENS[index];

  const go = useCallback((delta: number) => {
    setIndex((i) => (i + delta + SCREENS.length) % SCREENS.length);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const counter = useMemo(
    () => `${index + 1} / ${SCREENS.length}`,
    [index],
  );

  return (
    <div className="relative min-h-screen bg-bg text-text">
      <div className="absolute inset-0 grid-bg opacity-50" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/25 blur-[140px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-text-mute">/ Design preview</span>
        </div>
        <nav className="flex items-center gap-3 text-sm text-text-dim">
          <Link href="/" className="hover:text-text">Home</Link>
          <Link href="/studio" className="hover:text-text">Studio</Link>
          <Link href="/dj" className="hover:text-text">DJ Console</Link>
          <a
            href="https://github.com/CalSou/Sonara/tree/main/docs/design"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-text"
          >
            docs/design <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 pb-20">
        <section className="rounded-2xl border border-line bg-bg-panel/60 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-text">{screen.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-text-dim">{screen.caption}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="subtle"
                size="sm"
                onClick={() => go(-1)}
                aria-label="Previous mockup"
              >
                <ArrowLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="text-xs tabular-nums text-text-mute">{counter}</span>
              <Button
                variant="subtle"
                size="sm"
                onClick={() => go(1)}
                aria-label="Next mockup"
              >
                Next <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLightbox(true)}
                title="Open full-size"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full
              </Button>
            </div>
          </div>

          <div
            className="relative w-full overflow-hidden rounded-xl border border-line bg-bg-deep"
            style={{ aspectRatio: screen.ratio }}
          >
            <Image
              key={screen.src}
              src={screen.src}
              alt={screen.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-contain"
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SCREENS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                className={`group relative aspect-video overflow-hidden rounded-lg border transition ${
                  i === index
                    ? "border-accent shadow-glow"
                    : "border-line hover:border-accent/60"
                }`}
                aria-label={`Show ${s.title}`}
              >
                <Image
                  src={s.src}
                  alt={s.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-bg/80 px-2 py-1 text-left text-[10px] uppercase tracking-wider text-text">
                  {s.title}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <DesignCard
            title="Visual language"
            body="Surface #0A0A0F, primary purple #A855F7, cyan #22D3EE, accent pink #EC4899. Rounded-2xl cards, 1px low-opacity borders, soft purple glow on primary CTAs."
          />
          <DesignCard
            title="Typography"
            body="Geometric sans-serif (Inter / Geist). Tabular numerics for BPM and timecode. text-balance on hero tagline."
          />
          <DesignCard
            title="Status"
            body="Exploratory mockups — directional, not pixel-specs. Update the mockup in the same PR as any significant UI change."
          />
        </section>

        <p className="mt-6 text-xs text-text-mute">
          Tip: use ← / → keys to step through mockups. Click <span className="text-text">Full</span> for an unscaled lightbox.
        </p>
      </main>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 p-4 backdrop-blur"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-5 top-5 rounded-full border border-line bg-bg-panel p-2 text-text hover:border-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div
            className="relative h-full w-full max-w-[1400px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={screen.src}
              alt={screen.title}
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DesignCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-panel/60 p-4">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm text-text-dim">{body}</p>
    </div>
  );
}
