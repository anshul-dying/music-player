import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { eq } from "drizzle-orm";
import { Redis } from "ioredis";
import { requireUser } from "./playlists.js";
import { importRateLimitConfig } from "../rateLimit.js";
import { idParams, importBody, parseRequest } from "./schemas.js";
import { getImportQueue } from "../spotify/queue.js";
import { getValidSpotifyAccessToken } from "../spotify/oauthClient.js";

export const importRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.get("/spotify/playlists", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const token = await getValidSpotifyAccessToken(userId);
    if (!token) {
      return reply.status(400).send({ error: "spotify_not_connected" });
    }

    const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return reply.status(502).send({ error: "spotify_api_error" });
    }
    const data = (await res.json()) as { items?: any[] };
    const playlists = (data.items || [])
      .filter((p) => p && p.id)
      .map((p) => ({
        id: p.id as string,
        name: (p.name as string) || "Untitled Playlist",
        trackCount: p.tracks?.total ?? 0,
        coverUrl: p.images?.[0]?.url ?? null,
      }));

    return { playlists };
  });

  app.post("/spotify", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const { kind, playlistIds, playlistUrl } = parseRequest(importBody, req.body ?? {});

    if (playlistUrl) {
      const valid = /(?:playlist\/|spotify:playlist:)([A-Za-z0-9]{10,})|^[A-Za-z0-9]{22}$/.test(
        playlistUrl
      );
      if (!valid) {
        return reply.status(400).send({ error: "invalid_playlist_url" });
      }
    }

    const isTest = process.env.NODE_ENV === "test";
    const token = playlistUrl ? "public" : await getValidSpotifyAccessToken(userId);
    if (!token && !isTest) {
      return reply.status(400).send({ error: "spotify_not_connected" });
    }

    const queue = getImportQueue();
    if (!queue && !isTest) {
      return reply.status(503).send({ error: "queue_unavailable" });
    }

    const effectiveKind = playlistUrl ? "playlists" : kind;
    const [job] = await db
      .insert(schema.importJobs)
      .values({ userId, kind: effectiveKind, status: "queued" })
      .returning();

    if (queue) {
      try {
        await queue.add("spotify-import", {
          jobId: job.id,
          userId,
          kind: effectiveKind,
          playlistIds,
          playlistUrl,
        });
      } catch (err) {
        await db
          .update(schema.importJobs)
          .set({ status: "failed", error: "enqueue_failed", updatedAt: new Date() })
          .where(eq(schema.importJobs.id, job.id));
        throw err;
      }
    }

    return reply.status(202).send({ job });
  });

  app.get("/:id", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = parseRequest(idParams, req.params);
    const [job] = await db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.id, id))
      .limit(1);
    if (!job || job.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }
    return { job };
  });

  app.get("/:id/events", importRateLimitConfig, async (req, reply) => {
    const userId = await requireUser(req);
    const { id } = parseRequest(idParams, req.params);
    const [initialJob] = await db
      .select()
      .from(schema.importJobs)
      .where(eq(schema.importJobs.id, id))
      .limit(1);

    if (!initialJob || initialJob.userId !== userId) {
      return reply.status(404).send({ error: "not_found" });
    }

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const sendEvent = (payload: unknown) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
      }
    };

    sendEvent(initialJob);
    if (initialJob.status === "done" || initialJob.status === "failed") {
      reply.raw.end();
      return;
    }

    let sub: Redis | null = null;
    const channel = `import:progress:${id}`;
    if (process.env.REDIS_URL) {
      sub = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
      sub.subscribe(channel).catch(() => {});
      sub.on("message", (_ch, msg) => {
        try {
          const parsed = JSON.parse(msg);
          sendEvent(parsed);
          if (parsed.status === "done" || parsed.status === "failed") {
            cleanup();
          }
        } catch {
          // Ignore malformed message
        }
      });
    }

    const pollTimer = setInterval(async () => {
      try {
        const [latest] = await db
          .select()
          .from(schema.importJobs)
          .where(eq(schema.importJobs.id, id))
          .limit(1);
        if (latest) {
          sendEvent(latest);
          if (latest.status === "done" || latest.status === "failed") {
            cleanup();
          }
        }
      } catch {
        // Ignore transient poll error
      }
    }, 1500);

    const cleanup = () => {
      clearInterval(pollTimer);
      if (sub) {
        sub.unsubscribe(channel).catch(() => {});
        sub.disconnect();
        sub = null;
      }
      if (!reply.raw.writableEnded) {
        reply.raw.end();
      }
    };

    req.raw.on("close", cleanup);
  });
};
