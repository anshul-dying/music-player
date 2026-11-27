import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "./playlists.js";
import { parseRequest } from "./schemas.js";

const deleteAccountBody = z.object({
  confirm: z.literal("DELETE"),
});

export const accountRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();

  app.get("/export", async (req, reply) => {
    const userId = await requireUser(req);

    const [profile] = await db
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    if (!profile) {
      return reply.status(404).send({ error: "not_found" });
    }

    const userPlaylists = await db
      .select()
      .from(schema.playlists)
      .where(eq(schema.playlists.userId, userId));

    const playlistIds = userPlaylists.map((p) => p.id);
    const tracks =
      playlistIds.length > 0
        ? await db
            .select()
            .from(schema.playlistTracks)
            .where(inArray(schema.playlistTracks.playlistId, playlistIds))
        : [];

    const tracksByPlaylist = new Map<string, typeof tracks>();
    for (const t of tracks) {
      const list = tracksByPlaylist.get(t.playlistId) ?? [];
      list.push(t);
      tracksByPlaylist.set(t.playlistId, list);
    }

    const userLikes = await db
      .select()
      .from(schema.likes)
      .where(eq(schema.likes.userId, userId))
      .orderBy(desc(schema.likes.createdAt));

    const userHistory = await db
      .select()
      .from(schema.playHistory)
      .where(eq(schema.playHistory.userId, userId))
      .orderBy(desc(schema.playHistory.playedAt));

    const payload = {
      exportedAt: new Date().toISOString(),
      user: profile,
      playlists: userPlaylists.map((pl) => ({
        ...pl,
        tracks: (tracksByPlaylist.get(pl.id) ?? []).sort((a, b) => a.position - b.position),
      })),
      likes: userLikes,
      playHistory: userHistory,
    };

    reply.header("Content-Disposition", 'attachment; filename="ganegan-export.json"');
    return payload;
  });

  app.delete("/", async (req, reply) => {
    const userId = await requireUser(req);
    parseRequest(deleteAccountBody, req.body ?? {});

    const deleted = await db
      .delete(schema.user)
      .where(eq(schema.user.id, userId))
      .returning();

    if (deleted.length === 0) {
      return reply.status(404).send({ error: "not_found" });
    }

    reply.clearCookie("better-auth.session_token", { path: "/" });
    return { ok: true };
  });
};
