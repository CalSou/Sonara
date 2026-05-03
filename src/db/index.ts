import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var -- Next.js dev hot reload singleton
  var __sonara_pg__: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  if (!connectionString) return null;
  return postgres(connectionString, { prepare: false, max: 10 });
}

/** Returns null when DATABASE_URL is unset (build / CI without DB). */
export function getDb() {
  const client = globalThis.__sonara_pg__ ?? createClient();
  if (!client) return null;
  if (process.env.NODE_ENV !== "production") {
    globalThis.__sonara_pg__ = client;
  }
  return drizzle(client, { schema });
}

/** Throws if DATABASE_URL is missing. Use in API routes that require persistence. */
export function requireDb() {
  const db = getDb();
  if (!db) {
    throw new Error(
      "DATABASE_URL is not set. Add it to `.env.local` (see `.env.example`).",
    );
  }
  return db;
}
