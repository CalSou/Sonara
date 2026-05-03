import type { NextAuthConfig } from "next-auth";

/** Safe for Edge (middleware): no bcrypt, postgres, or Drizzle. */
export function resolveAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
  const isNextCompilerBuild =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build";
  const isNpmBuild = process.env.npm_lifecycle_event === "build";

  if (
    process.env.NODE_ENV === "production" &&
    !secret &&
    !isNextCompilerBuild &&
    !isNpmBuild
  ) {
    throw new Error(
      "AUTH_SECRET or NEXTAUTH_SECRET must be set in production.",
    );
  }

  return secret || "development-secret-change-me";
}

export default {
  trustHost: true,
  secret: resolveAuthSecret(),
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
