"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useState } from "react";

import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

function RegisterInner() {
  const next = useSearchParams().get("next") ?? "/studio";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    let reg: Response;
    try {
      reg = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(name.trim() ? { name: name.trim() } : {}),
        }),
      });
    } catch {
      setBusy(false);
      setMsg("Network error. Is the dev server running?");
      return;
    }

    const regBody = (await reg.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
    };

    if (reg.status === 503 && regBody.code === "DB_UNAVAILABLE") {
      setBusy(false);
      setMsg(
        "Database is not configured. Start Postgres (docker compose -f docker-compose.dev.yml up -d), set DATABASE_URL in .env.local, then run npm run db:migrate.",
      );
      return;
    }

    if (!reg.ok) {
      setBusy(false);
      setMsg(regBody.error ?? `Registration failed (${reg.status})`);
      return;
    }

    const si = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });

    setBusy(false);

    if (!si?.ok) {
      setMsg("Account created but sign-in failed. Try signing in on the login page.");
      return;
    }

    window.location.href = next;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <Logo />
      <div>
        <h1 className="text-xl font-semibold text-text">Create account</h1>
        <p className="mt-2 text-sm text-text-dim">
          Register with email and password. Requires a configured{" "}
          <code className="rounded bg-bg-deep px-1 py-0.5 text-xs">DATABASE_URL</code>{" "}
          for persistence.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-wider text-text-mute">
          Display name{" "}
          <span className="font-normal tracking-normal text-text-dim">(optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg-deep px-3 py-2 text-sm text-text"
            placeholder="DJ Name"
            autoComplete="name"
          />
        </label>
        <label className="text-xs uppercase tracking-wider text-text-mute">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg-deep px-3 py-2 text-sm text-text"
            autoComplete="email"
          />
        </label>
        <label className="text-xs uppercase tracking-wider text-text-mute">
          Password{" "}
          <span className="font-normal tracking-normal text-text-dim">(min 8)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg-deep px-3 py-2 text-sm text-text"
            autoComplete="new-password"
          />
        </label>
        {msg && (
          <p className="rounded border border-line bg-bg-deep px-3 py-2 text-sm text-accent-pink">
            {msg}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>

      <p className="text-xs text-text-dim">
        Already have an account?{" "}
        <Link href={`/guest-login?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">
          Sign in
        </Link>
      </p>

      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back home
      </Link>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-dim">Loading…</div>}>
      <RegisterInner />
    </Suspense>
  );
}
