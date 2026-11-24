import { randomBytes } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { getDb, schema, encryptToken } from "@mp/db";
import { eq } from "drizzle-orm";
import { requireUser } from "./playlists.js";
import { getRedisClient } from "../redis.js";
import {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  generatePkcePair,
  getSpotifyConfig,
} from "../spotify/oauthClient.js";

interface PkceSession {
  userId: string;
  codeVerifier: string;
  expiresAt: number;
}

const memoryPkceStore = new Map<string, PkceSession>();
const PKCE_TTL_SEC = 600;

async function savePkceState(state: string, session: PkceSession): Promise<void> {
  const redis = getRedisClient();
  if (redis && redis.status === "ready") {
    try {
      await redis.set(`spotify:pkce:${state}`, JSON.stringify(session), "EX", PKCE_TTL_SEC);
      return;
    } catch {
      // Fallback to in-memory store
    }
  }
  memoryPkceStore.set(state, session);
}

async function consumePkceState(state: string): Promise<PkceSession | null> {
  const redis = getRedisClient();
  if (redis && redis.status === "ready") {
    try {
      const key = `spotify:pkce:${state}`;
      const raw = await redis.get(key);
      if (raw) {
        await redis.del(key);
        return JSON.parse(raw) as PkceSession;
      }
    } catch {
      // Fallback to in-memory store
    }
  }
  const session = memoryPkceStore.get(state) || null;
  memoryPkceStore.delete(state);
  if (session && session.expiresAt < Date.now()) return null;
  return session;
}

export const spotifyAuthRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.get("/status", async (req) => {
    const userId = await requireUser(req);
    const { clientId } = getSpotifyConfig();
    const [row] = await db
      .select({ expiresAt: schema.spotifyTokens.expiresAt })
      .from(schema.spotifyTokens)
      .where(eq(schema.spotifyTokens.userId, userId))
      .limit(1);

    return {
      configured: Boolean(clientId),
      connected: Boolean(row),
    };
  });

  app.get("/start", async (req, reply) => {
    const userId = await requireUser(req);
    const { clientId, redirectUri } = getSpotifyConfig();
    if (!clientId) {
      return reply.status(503).send({ error: "spotify_not_configured" });
    }

    const { codeVerifier, codeChallenge } = generatePkcePair();
    const state = randomBytes(24).toString("base64url");
    await savePkceState(state, {
      userId,
      codeVerifier,
      expiresAt: Date.now() + PKCE_TTL_SEC * 1000,
    });

    const authorizeUrl = buildSpotifyAuthorizeUrl({
      clientId,
      redirectUri,
      state,
      codeChallenge,
    });

    const query = req.query as { mode?: string } | undefined;
    if (query?.mode === "json") {
      return { authorizeUrl };
    }
    return reply.redirect(authorizeUrl);
  });

  app.get("/callback", async (req, reply) => {
    const { clientId, clientSecret, redirectUri, appOrigin } = getSpotifyConfig();
    const query = req.query as { code?: string; state?: string; error?: string };

    if (query.error || !query.code || !query.state) {
      return reply.redirect(`${appOrigin}/library?spotify=error`);
    }

    const session = await consumePkceState(query.state);
    if (!session) {
      return reply.redirect(`${appOrigin}/library?spotify=expired`);
    }

    try {
      const tokens = await exchangeSpotifyCode({
        clientId,
        clientSecret,
        code: query.code,
        codeVerifier: session.codeVerifier,
        redirectUri,
      });

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      const accessTokenEnc = encryptToken(tokens.access_token);
      const refreshTokenEnc = encryptToken(tokens.refresh_token || "");

      await db
        .insert(schema.spotifyTokens)
        .values({
          userId: session.userId,
          accessTokenEnc,
          refreshTokenEnc,
          expiresAt,
          scope: tokens.scope ?? null,
        })
        .onConflictDoUpdate({
          target: schema.spotifyTokens.userId,
          set: {
            accessTokenEnc,
            refreshTokenEnc,
            expiresAt,
            scope: tokens.scope ?? null,
            updatedAt: new Date(),
          },
        });

      return reply.redirect(`${appOrigin}/library?spotify=connected`);
    } catch (err) {
      req.log.error(err, "Spotify OAuth callback failed");
      return reply.redirect(`${appOrigin}/library?spotify=error`);
    }
  });

  app.post("/disconnect", async (req) => {
    const userId = await requireUser(req);
    await db.delete(schema.spotifyTokens).where(eq(schema.spotifyTokens.userId, userId));
    return { ok: true };
  });
};
