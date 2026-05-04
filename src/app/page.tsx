import Link from "next/link";
import {
  Music2,
  Disc3,
  Sparkles,
  Layers,
  Wand2,
  Volume2,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-accent/30 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-accent-cyan/20 blur-[120px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <nav className="flex items-center gap-6 text-sm text-text-dim">
          <Link href="/studio" className="hover:text-text">Studio</Link>
          <Link href="/dj" className="hover:text-text">DJ Console</Link>
          <Link href="/design" className="hover:text-text">Design</Link>
          <a
            href="https://github.com"
            className="hover:text-text"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        <section className="pt-16 pb-12 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-bg-panel/60 px-3 py-1 text-xs text-text-dim">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            AI-native music studio + DJ booth
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight md:text-6xl">
            Make music. <span className="text-glow text-accent">Mix sets.</span>
            <br />
            All in your browser.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-text-dim">
            Generate ideas from a prompt, separate stems, master your tracks, and
            spin a live two-deck DJ set — with an AI co-pilot that beatmatches
            and plans your transitions.
          </p>

          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              href="/studio"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-sm font-medium text-white shadow-glow transition hover:bg-accent/90"
            >
              <Music2 className="h-4 w-4" />
              Open Studio
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/dj"
              className="group inline-flex h-12 items-center gap-2 rounded-full border border-line bg-bg-panel/70 px-6 text-sm font-medium text-text transition hover:border-accent-cyan/60 hover:bg-bg-raised"
            >
              <Disc3 className="h-4 w-4 text-accent-cyan" />
              Open DJ Console
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2">
          <ModeCard
            href="/studio"
            title="Production Studio"
            tag="MULTITRACK"
            tagClass="text-accent"
            description="Compose with multiple tracks, generate loops from text prompts, separate any sample into stems, and master to streaming-ready loudness."
            icon={<Music2 className="h-5 w-5" />}
            features={[
              { icon: <Wand2 className="h-3.5 w-3.5" />, text: "Generate from prompt" },
              { icon: <Layers className="h-3.5 w-3.5" />, text: "Stem separation" },
              { icon: <Volume2 className="h-3.5 w-3.5" />, text: "AI mastering" },
            ]}
            gradient="from-accent/20 via-accent/5 to-transparent"
          />
          <ModeCard
            href="/dj"
            title="DJ Console"
            tag="LIVE"
            tagClass="text-accent-cyan"
            description="Two-deck mixer with EQ, filters, pitch and crossfader. Toggle Auto-Mix to let the AI sequence and beatmatch your set."
            icon={<Disc3 className="h-5 w-5" />}
            features={[
              { icon: <Disc3 className="h-3.5 w-3.5" />, text: "Two-deck mixer" },
              { icon: <Sparkles className="h-3.5 w-3.5" />, text: "AI auto-mix" },
              { icon: <Volume2 className="h-3.5 w-3.5" />, text: "Beatmatch + key" },
            ]}
            gradient="from-accent-cyan/20 via-accent-cyan/5 to-transparent"
          />
        </section>

        <footer className="border-t border-line py-6 text-center text-xs text-text-mute">
          Built with Web Audio API · AI providers swappable via clean interfaces
        </footer>
      </main>
    </div>
  );
}

function ModeCard({
  href,
  title,
  tag,
  tagClass,
  description,
  icon,
  features,
  gradient,
}: {
  href: string;
  title: string;
  tag: string;
  tagClass: string;
  description: string;
  icon: React.ReactNode;
  features: { icon: React.ReactNode; text: string }[];
  gradient: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-line bg-bg-panel p-6 transition hover:border-accent/50"
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`} />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-bg-deep text-text">
            {icon}
          </div>
          <span className={`text-[10px] font-semibold tracking-widest ${tagClass}`}>
            {tag}
          </span>
        </div>
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-text-dim">{description}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {features.map((f, i) => (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg-deep px-2.5 py-1 text-xs text-text-dim"
            >
              <span className={tagClass}>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
        <div className="mt-6 inline-flex items-center gap-1.5 text-sm text-text-dim transition group-hover:text-text">
          Launch
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
