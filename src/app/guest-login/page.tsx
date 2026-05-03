"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useState } from "react";

import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";

function GuestLoginInner() {
  const next = useSearchParams().get("next") ?? "/studio";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: next,
    });
    setBusy(false);
    if (!res?.ok) {
      setMsg("Sign-in failed. Register first if you have no account.");
      return;
    }
    window.location.href = next;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <Logo />
      <div>
        <h1 className="text-xl font-semibold text-text">Sign in</h1>
        <p className="mt-2 text-sm text-text-dim">
          Protected routes require authentication when{" "}
          <code className="rounded bg-bg-deep px-1 py-0.5 text-xs">
            NEXT_PUBLIC_REQUIRE_AUTH=true
          </code>
          .
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-wider text-text-mute">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg-deep px-3 py-2 text-sm text-text"
          />
        </label>
        <label className="text-xs uppercase tracking-wider text-text-mute">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-bg-deep px-3 py-2 text-sm text-text"
          />
        </label>
        {msg && <p className="text-sm text-accent-pink">{msg}</p>}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "Signing in…" : "Continue"}
        </Button>
      </form>

      <p className="text-xs text-text-dim">
        No account? Register via{" "}
        <code className="rounded bg-bg-deep px-1 py-0.5">POST /api/v1/auth/register</code>{" "}
        or continue as guest when auth is disabled.
      </p>

      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back home
      </Link>
    </div>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-dim">Loading…</div>}>
      <GuestLoginInner />
    </Suspense>
  );
}
