import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { desc, eq, sql } from "drizzle-orm";
import { requireUser } from "./playlists.js";
import { invalidateProfileStatsCache } from "./profile.js";
import { historyBody, parseRequest } from "./schemas.js";

export const historyRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.post("/", async (req, reply) => {
    const userId = await requireUser(req);
    const body = parseRequest(historyBody, req.body ?? {});
    await db.transaction(async (tx) => {
      await tx.insert(schema.playHistory).values({
        userId,
        videoId: body.videoId,
        msPlayed: body.msPlayed,
      });

      if (body.title === undefined || body.artist === undefined) return;
      // `tracks` is shared by every user, so the first title/artist stays; later plays
      // only count the play and fill in cover art or duration that are still missing.
      await tx
        .insert(schema.tracks)
        .values({
          videoId: body.videoId,
          title: body.title,
          artist: body.artist,
          albumArt: body.albumArt ?? null,
          durationSec: body.durationSec ?? 0,
          playCount: 1,
        })
        .onConflictDoUpdate({
          target: schema.tracks.videoId,
          set: {
            playCount: sql`${schema.tracks.playCount} + 1`,
            albumArt: sql`coalesce(${schema.tracks.albumArt}, excluded.album_art)`,
            durationSec: sql`case when ${schema.tracks.durationSec} = 0 then excluded.duration_sec else ${schema.tracks.durationSec} end`,
            updatedAt: sql`now()`,
          },
        });
    });
    await invalidateProfileStatsCache(userId);
    return reply.status(201).send({ ok: true });
  });

  app.get("/", async (req) => {
    const userId = await requireUser(req);
    const rows = await db
      .select({
        id: schema.playHistory.id,
        userId: schema.playHistory.userId,
        videoId: schema.playHistory.videoId,
        playedAt: schema.playHistory.playedAt,
        msPlayed: schema.playHistory.msPlayed,
        title: schema.tracks.title,
        artist: schema.tracks.artist,
        albumArt: schema.tracks.albumArt,
        durationSec: schema.tracks.durationSec,
      })
      .from(schema.playHistory)
      .leftJoin(schema.tracks, eq(schema.tracks.videoId, schema.playHistory.videoId))
      .where(eq(schema.playHistory.userId, userId))
      .orderBy(desc(schema.playHistory.playedAt))
      .limit(100);
    return { history: rows };
  });
};
