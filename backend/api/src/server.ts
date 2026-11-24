import { toNodeHandler } from "better-auth/node";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { fileURLToPath } from "node:url";
import { auth, trustedOrigins } from "./auth.js";
import { errorHandler } from "./errorHandler.js";
import { playlistsRoutes } from "./routes/playlists.js";
import { likesRoutes } from "./routes/likes.js";
import { historyRoutes } from "./routes/history.js";
import { lyricsRoutes } from "./routes/lyrics.js";
import { importRoutes } from "./routes/import.js";
import { spotifyAuthRoutes } from "./routes/spotifyAuth.js";
import {
  createCredentialRateLimiter,
  getRateLimitPluginOptions,
  type RateLimitOptions,
} from "./rateLimit.js";
import { parseTrustProxy } from "./trustProxy.js";
import { closeDb } from "@mp/db";
import { closeRedis, waitForRedisReady } from "./redis.js";
import { closeImportQueue } from "./spotify/queue.js";

export interface BuildServerOptions {
  logger?: boolean;
  rateLimit?: RateLimitOptions;
}

export async function buildServer(opts?: BuildServerOptions): Promise<FastifyInstance> {
  const isTest = process.env.NODE_ENV === "test";
  const app = Fastify({
    logger: opts?.logger ?? (isTest ? false : true),
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  });

  await app.register(cors, {
    origin: trustedOrigins,
    credentials: true,
  });

  await app.register(cookie);

  // Rate limiting: enabled by default in prod/dev, configurable in tests
  const rateLimitEnabled = opts?.rateLimit?.enabled ?? !isTest;
  if (rateLimitEnabled) {
    await app.register(rateLimit, getRateLimitPluginOptions(opts?.rateLimit));
    await waitForRedisReady();
  }
  const limitCredentials = rateLimitEnabled ? createCredentialRateLimiter(app) : undefined;

  // Better Auth mounts all of /api/auth/*. Handled in onRequest so Fastify's
  // body parser never consumes the stream — Better Auth parses it itself.
  app.addHook("onRequest", async (req, reply) => {
    const url = req.raw.url?.split("?")[0];
    if (url?.startsWith("/api/auth/spotify/")) return;
    if (url !== "/api/auth" && !url?.startsWith("/api/auth/")) return;
    if (await limitCredentials?.(req, reply)) return reply;
    // Better Auth keys its own limiter on X-Forwarded-For and only accepts a
    // single value, so hand it the address Fastify resolved through trustProxy.
    req.raw.headers["x-forwarded-for"] = req.ip;
    reply.hijack();
    toNodeHandler(auth)(req.raw, reply.raw);
  });

  app.setErrorHandler(errorHandler);

  app.get("/healthz", async () => ({ ok: true, ts: Date.now() }));

  await app.register(playlistsRoutes, { prefix: "/api/playlists" });
  await app.register(likesRoutes, { prefix: "/api/likes" });
  await app.register(historyRoutes, { prefix: "/api/history" });
  await app.register(lyricsRoutes, { prefix: "/api/lyrics" });
  await app.register(importRoutes, { prefix: "/api/import" });
  await app.register(spotifyAuthRoutes, { prefix: "/api/auth/spotify" });

  app.addHook("onClose", async () => {
    await closeImportQueue();
    await closeDb();
    await closeRedis();
  });

  return app;
}

// Only start the server when run directly (e.g. tsx src/server.ts)
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("/server.ts") ||
    process.argv[1].endsWith("/server.js") ||
    (import.meta.url && fileURLToPath(import.meta.url) === process.argv[1]));

if (isMain) {
  void (async () => {
    const app = await buildServer();
    const port = Number(process.env.PORT ?? 4000);
    await app.listen({ port, host: "0.0.0.0" });
    app.log.info(`api listening on :${port}`);
  })();
}
