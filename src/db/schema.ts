import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------- Auth.js / Adapter ---------------------------- */

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
  }),
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    pk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

/* ------------------------------- App schema -------------------------------- */

export const audioAssetTypeEnum = pgEnum("audio_asset_type", [
  "generated",
  "uploaded",
  "stem",
]);

export const generationJobTypeEnum = pgEnum("generation_job_type", [
  "generate",
  "separate",
  "master",
  "analyse",
]);

export const generationJobStatusEnum = pgEnum("generation_job_status", [
  "pending",
  "processing",
  "complete",
  "failed",
]);

export const publishProviderEnum = pgEnum("publish_provider", [
  "soundcloud",
  "youtube",
]);

export const releaseDraftStatusEnum = pgEnum("release_draft_status", [
  "draft",
  "exported",
  "linked_out",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bpm: integer("bpm"),
    stateJson: jsonb("state_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    userIdx: index("projects_user_id_idx").on(t.userId),
  }),
);

export const setlists = pgTable(
  "setlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    stateJson: jsonb("state_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    userIdx: index("setlists_user_id_idx").on(t.userId),
  }),
);

export const audioAssets = pgTable(
  "audio_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: audioAssetTypeEnum("type").notNull(),
    storageUrl: text("storage_url").notNull(),
    bpm: doublePrecision("bpm"),
    key: text("key"),
    durationS: doublePrecision("duration_s"),
    parentId: uuid("parent_id").references((): AnyPgColumn => audioAssets.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    userIdx: index("audio_assets_user_id_idx").on(t.userId),
  }),
);

export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: generationJobTypeEnum("type").notNull(),
    status: generationJobStatusEnum("status").notNull().default("pending"),
    replicateId: text("replicate_id"),
    inputJson: jsonb("input_json"),
    outputJson: jsonb("output_json"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    userIdx: index("generation_jobs_user_id_idx").on(t.userId),
    statusIdx: index("generation_jobs_status_idx").on(t.status),
  }),
);

export const publishConnections = pgTable(
  "publish_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: publishProviderEnum("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    accessTokenCipher: text("access_token_cipher").notNull(),
    accessTokenExpires: timestamp("access_token_expires", {
      withTimezone: true,
    }).notNull(),
    refreshTokenCipher: text("refresh_token_cipher"),
    scope: text("scope"),
    connectedAt: timestamp("connected_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("publish_connections_user_idx").on(t.userId),
  }),
);

export const releaseDrafts = pgTable(
  "release_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metadataJson: jsonb("metadata_json").notNull(),
    deliveryAssetId: uuid("delivery_asset_id").references(() => audioAssets.id, {
      onDelete: "set null",
    }),
    distributor: text("distributor").notNull(),
    status: releaseDraftStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => ({
    userIdx: index("release_drafts_user_idx").on(t.userId),
  }),
);

export const projectsRelations = relations(projects, ({ one }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
}));

export const setlistsRelations = relations(setlists, ({ one }) => ({
  user: one(users, { fields: [setlists.userId], references: [users.id] }),
}));

export const audioAssetsRelations = relations(audioAssets, ({ one }) => ({
  user: one(users, { fields: [audioAssets.userId], references: [users.id] }),
}));

export const generationJobsRelations = relations(generationJobs, ({ one }) => ({
  user: one(users, { fields: [generationJobs.userId], references: [users.id] }),
}));

export const publishConnectionsRelations = relations(publishConnections, ({ one }) => ({
  user: one(users, { fields: [publishConnections.userId], references: [users.id] }),
}));

export const releaseDraftsRelations = relations(releaseDrafts, ({ one }) => ({
  user: one(users, { fields: [releaseDrafts.userId], references: [users.id] }),
  deliveryAsset: one(audioAssets, {
    fields: [releaseDrafts.deliveryAssetId],
    references: [audioAssets.id],
  }),
}));
