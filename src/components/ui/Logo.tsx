import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 font-semibold tracking-tight"
    >
      <svg width="22" height="22" viewBox="0 0 22 22" className="text-accent">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="9" fill="none" stroke="url(#lg)" strokeWidth="1.5" />
        <circle cx="11" cy="11" r="3" fill="url(#lg)" />
        <path d="M11 2 V 5 M11 17 V 20 M2 11 H 5 M17 11 H 20" stroke="url(#lg)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-text">Sonara</span>
    </Link>
  );
}
