import { and, eq, isNull } from "drizzle-orm";

import type { getDb } from "@/db/index";
import { publishConnections } from "@/db/schema";
import { decryptToken, encryptToken } from "@/lib/crypto/tokens";
import {
  refreshGoogleAccessToken,
  refreshSoundCloudAccessToken,
  revokeGoogleOAuthToken,
} from "@/lib/publish/oauthTokenRefresh";
import { assertPublishCryptoProduction } from "@/lib/publish/publishEnv";

export type PublishProvider = "soundcloud" | "youtube";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function upsertPublishConnection(
  db: Db,
  params: {
    userId: string;
    provider: PublishProvider;
    providerAccountId: string;
    accessToken: string;
    accessTokenExpires: Date;
    refreshToken: string | null;
    scope?: string | null;
  },
) {
  assertPublishCryptoProduction();
  const existing = await db.query.publishConnections.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.userId, params.userId), e(t.provider, params.provider), n(t.revokedAt)),
  });

  const values = {
    userId: params.userId,
    provider: params.provider,
    providerAccountId: params.providerAccountId,
    accessTokenCipher: encryptToken(params.accessToken),
    accessTokenExpires: params.accessTokenExpires,
    refreshTokenCipher: params.refreshToken
      ? encryptToken(params.refreshToken)
      : null,
    scope: params.scope ?? null,
    revokedAt: null,
    connectedAt: existing?.connectedAt ?? new Date(),
    lastUsedAt: new Date(),
  };

  if (existing) {
    await db
      .update(publishConnections)
      .set(values)
      .where(eq(publishConnections.id, existing.id));
  } else {
    await db.insert(publishConnections).values(values);
  }
}

export async function revokePublishConnection(
  db: Db,
  userId: string,
  provider: PublishProvider,
) {
  await db
    .update(publishConnections)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(publishConnections.userId, userId),
        eq(publishConnections.provider, provider),
        isNull(publishConnections.revokedAt),
      ),
    );
}

export async function disconnectPublishProviderBestEffort(
  db: Db,
  userId: string,
  provider: PublishProvider,
) {
  assertPublishCryptoProduction();
  const row = await db.query.publishConnections.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.userId, userId), e(t.provider, provider), n(t.revokedAt)),
  });

  if (row && process.env.PUBLISH_MOCK_PROVIDERS !== "true") {
    try {
      if (provider === "youtube") {
        const refreshPlain = row.refreshTokenCipher
          ? decryptToken(row.refreshTokenCipher)
          : null;
        const accessPlain = decryptToken(row.accessTokenCipher);
        await revokeGoogleOAuthToken(refreshPlain ?? accessPlain);
      }
      // SoundCloud partner API does not expose a stable public revoke URL; DB revoke only.
    } catch {
      /* best-effort */
    }
  }

  await revokePublishConnection(db, userId, provider);
}

export async function withFreshAccessToken<T>(
  db: Db,
  userId: string,
  provider: PublishProvider,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  if (process.env.PUBLISH_MOCK_PROVIDERS === "true") {
    return fn(process.env.PUBLISH_MOCK_ACCESS_TOKEN ?? "mock-access-token");
  }

  assertPublishCryptoProduction();

  const row = await db.query.publishConnections.findFirst({
    where: (t, { eq: e, and: a, isNull: n }) =>
      a(e(t.userId, userId), e(t.provider, provider), n(t.revokedAt)),
  });
  if (!row) {
    throw new Error("NOT_CONNECTED");
  }

  const refreshPlain = row.refreshTokenCipher
    ? decryptToken(row.refreshTokenCipher)
    : null;

  let accessToken = decryptToken(row.accessTokenCipher);
  const expiresMs = row.accessTokenExpires.getTime();
  const needsRefresh = Date.now() > expiresMs - 60_000;

  if (needsRefresh) {
    if (!refreshPlain) {
      throw new Error("TOKEN_EXPIRED_NO_REFRESH");
    }
    if (provider === "soundcloud") {
      const tok = await refreshSoundCloudAccessToken(refreshPlain);
      accessToken = tok.access_token;
      const nextRefresh = tok.refresh_token ?? refreshPlain;
      await db
        .update(publishConnections)
        .set({
          accessTokenCipher: encryptToken(accessToken),
          accessTokenExpires: new Date(Date.now() + tok.expires_in * 1000),
          refreshTokenCipher: encryptToken(nextRefresh),
          lastUsedAt: new Date(),
        })
        .where(eq(publishConnections.id, row.id));
    } else {
      const tok = await refreshGoogleAccessToken(refreshPlain);
      accessToken = tok.access_token;
      const nextRefresh = tok.refresh_token ?? refreshPlain;
      await db
        .update(publishConnections)
        .set({
          accessTokenCipher: encryptToken(accessToken),
          accessTokenExpires: new Date(Date.now() + tok.expires_in * 1000),
          refreshTokenCipher: encryptToken(nextRefresh),
          lastUsedAt: new Date(),
        })
        .where(eq(publishConnections.id, row.id));
    }
  } else {
    await db
      .update(publishConnections)
      .set({ lastUsedAt: new Date() })
      .where(eq(publishConnections.id, row.id));
  }

  return fn(accessToken);
}

/** Safe summary for GET /connections (no tokens). */
export async function listPublishConnections(db: Db, userId: string) {
  const rows = await db.query.publishConnections.findMany({
    where: (t, { eq: e, and: a, isNull: n }) => a(e(t.userId, userId), n(t.revokedAt)),
  });
  const out: Partial<
    Record<PublishProvider, { connected: true; accountId: string; connectedAt: string }>
  > = {};
  for (const r of rows) {
    const p = r.provider as PublishProvider;
    out[p] = {
      connected: true,
      accountId: r.providerAccountId,
      connectedAt: r.connectedAt.toISOString(),
    };
  }
  return out;
}
