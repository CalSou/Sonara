import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

import authConfig from "./auth.config";
import { getDb } from "@/db/index";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "@/db/schema";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

const db = getDb();

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: authConfig.secret,
  adapter: db
    ? DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      })
    : undefined,
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
    ...(githubClientId && githubClientSecret
      ? [
          GitHub({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
          }),
        ]
      : []),
    Credentials({
      id: "credentials",
      name: "Email & password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!db) return null;
        const email = creds?.email as string | undefined;
        const password = creds?.password as string | undefined;
        if (!email || !password) return null;

        const row = await db.query.users.findFirst({
          where: (u, { eq }) => eq(u.email, email),
        });
        if (!row?.passwordHash) return null;

        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email ?? undefined,
          name: row.name ?? undefined,
          image: row.image ?? undefined,
        };
      },
    }),
  ],
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
