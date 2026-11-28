import type { FastifyPluginAsync } from "fastify";
import { getDb, schema } from "@mp/db";
import { profileStatsRangeSchema, type ProfileStatsRange, type ProfileStatsResponse } from "@mp/api-contract";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createCache } from "../cache.js";
import { requireUser } from "./playlists.js";
import { parseRequest } from "./schemas.js";

const RANGE_OPTIONS: readonly ProfileStatsRange[] = ["7d", "30d", "1y", "all"];
const CACHE_TTL_SEC = 300;
const DAY_MS = 86_400_000;

const querySchema = z.object({
  range: profileStatsRangeSchema.default("30d"),
});

function cacheKey(userId: string, range: ProfileStatsRange): string {
  return `profile:stats:${userId}:${range}`;
}

export async function invalidateProfileStatsCache(userId: string): Promise<void> {
  const cache = createCache();
  await Promise.all(RANGE_OPTIONS.map((r) => cache.del(cacheKey(userId, r))));
}

function getRangeCutoff(range: ProfileStatsRange, now: Date): Date | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 365;
  return new Date(now.getTime() - days * DAY_MS);
}

function toIsoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreaks(dayCounts: Map<string, number>, now: Date): { current: number; longest: number } {
  if (dayCounts.size === 0) return { current: 0, longest: 0 };
  const sortedDays = Array.from(dayCounts.keys()).sort();

  let longest = 0;
  let run = 0;
  let prevMs: number | null = null;
  for (const iso of sortedDays) {
    const ms = Date.parse(`${iso}T00:00:00Z`);
    run = prevMs !== null && ms - prevMs === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
    prevMs = ms;
  }

  let current = 0;
  const todayIso = toIsoDay(now);
  const yesterdayIso = toIsoDay(new Date(now.getTime() - DAY_MS));
  let cursorMs = dayCounts.has(todayIso)
    ? Date.parse(`${todayIso}T00:00:00Z`)
    : dayCounts.has(yesterdayIso)
      ? Date.parse(`${yesterdayIso}T00:00:00Z`)
      : null;

  while (cursorMs !== null && dayCounts.has(toIsoDay(new Date(cursorMs)))) {
    current += 1;
    cursorMs -= DAY_MS;
  }

  return { current, longest };
}

export const profileRoutes: FastifyPluginAsync = async (app) => {
  const db = getDb();
  const cache = createCache();

  app.get("/stats", async (req) => {
    const userId = await requireUser(req);
    const { range } = parseRequest(querySchema, req.query ?? {});
    const key = cacheKey(userId, range);

    const cached = await cache.get(key);
    if (cached) {
      return JSON.parse(cached) as ProfileStatsResponse;
    }

    const now = new Date();
    const cutoff = getRangeCutoff(range, now);

    const [userRow] = await db
      .select({ createdAt: schema.user.createdAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);

    const [spotifyRow] = await db
      .select({ userId: schema.spotifyTokens.userId })
      .from(schema.spotifyTokens)
      .where(eq(schema.spotifyTokens.userId, userId))
      .limit(1);

    const rows = await db
      .select({
        videoId: schema.playHistory.videoId,
        playedAt: schema.playHistory.playedAt,
        msPlayed: schema.playHistory.msPlayed,
        title: schema.tracks.title,
        artist: schema.tracks.artist,
        album: schema.tracks.album,
        albumArt: schema.tracks.albumArt,
        durationSec: schema.tracks.durationSec,
        preferredItag: schema.tracks.preferredItag,
      })
      .from(schema.playHistory)
      .leftJoin(schema.tracks, eq(schema.tracks.videoId, schema.playHistory.videoId))
      .where(eq(schema.playHistory.userId, userId))
      .orderBy(desc(schema.playHistory.playedAt));

    const allDayCounts = new Map<string, number>();
    for (const row of rows) {
      const iso = toIsoDay(row.playedAt);
      allDayCounts.set(iso, (allDayCounts.get(iso) ?? 0) + 1);
    }

    const streaks = computeStreaks(allDayCounts, now);
    const activityDays: { date: string; count: number }[] = [];
    for (let i = 364; i >= 0; i--) {
      const iso = toIsoDay(new Date(now.getTime() - i * DAY_MS));
      activityDays.push({ date: iso, count: allDayCounts.get(iso) ?? 0 });
    }

    const filtered = cutoff ? rows.filter((r) => r.playedAt >= cutoff) : rows;

    let totalMs = 0;
    const artistsSet = new Set<string>();
    const albumsSet = new Set<string>();
    const trackMap = new Map<
      string,
      {
        videoId: string;
        title: string;
        artist: string;
        album: string | null;
        albumArt: string | null;
        durationSec: number;
        plays: number;
        totalMs: number;
      }
    >();
    const artistMap = new Map<
      string,
      { artist: string; albumArt: string | null; plays: number; totalMs: number; tracks: Set<string> }
    >();
    const albumMap = new Map<
      string,
      { album: string; artist: string; albumArt: string | null; videoId: string; plays: number; totalMs: number }
    >();
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: `${String(hour).padStart(2, "0")}`,
      count: 0,
      totalMs: 0,
    }));

    let opusCount = 0;
    let aacCount = 0;

    for (const row of filtered) {
      const ms = Math.max(0, row.msPlayed);
      totalMs += ms;

      const hour = row.playedAt.getUTCHours();
      hourly[hour].count += 1;
      hourly[hour].totalMs += ms;

      if (row.preferredItag === 140) {
        aacCount += 1;
      } else {
        opusCount += 1;
      }

      const title = row.title ?? "Unknown Track";
      const artist = row.artist ?? "Unknown Artist";
      const albumName = row.album ?? title;

      if (row.artist) artistsSet.add(row.artist);
      if (row.album || row.title) albumsSet.add(`${artist}::${albumName}`);

      const existingTrack = trackMap.get(row.videoId);
      if (existingTrack) {
        existingTrack.plays += 1;
        existingTrack.totalMs += ms;
      } else {
        trackMap.set(row.videoId, {
          videoId: row.videoId,
          title,
          artist,
          album: row.album ?? null,
          albumArt: row.albumArt ?? null,
          durationSec: row.durationSec ?? 0,
          plays: 1,
          totalMs: ms,
        });
      }

      const existingArtist = artistMap.get(artist);
      if (existingArtist) {
        existingArtist.plays += 1;
        existingArtist.totalMs += ms;
        existingArtist.tracks.add(row.videoId);
        if (!existingArtist.albumArt && row.albumArt) existingArtist.albumArt = row.albumArt;
      } else {
        artistMap.set(artist, {
          artist,
          albumArt: row.albumArt ?? null,
          plays: 1,
          totalMs: ms,
          tracks: new Set([row.videoId]),
        });
      }

      const albumKey = `${artist}::${albumName}`;
      const existingAlbum = albumMap.get(albumKey);
      if (existingAlbum) {
        existingAlbum.plays += 1;
        existingAlbum.totalMs += ms;
      } else {
        albumMap.set(albumKey, {
          album: albumName,
          artist,
          albumArt: row.albumArt ?? null,
          videoId: row.videoId,
          plays: 1,
          totalMs: ms,
        });
      }
    }

    const totalCodecStreams = opusCount + aacCount;
    const opusPct = totalCodecStreams > 0 ? Math.round((opusCount / totalCodecStreams) * 100) : 100;
    const aacPct = totalCodecStreams > 0 ? 100 - opusPct : 0;
    const avgBitrateKbps =
      totalCodecStreams > 0 ? Math.round((opusCount * 160 + aacCount * 128) / totalCodecStreams) : 160;

    const payload: ProfileStatsResponse = {
      range,
      totalListeningSec: Math.round(totalMs / 1000),
      totalStreams: filtered.length,
      uniqueArtists: artistsSet.size,
      uniqueAlbums: albumsSet.size,
      currentStreakDays: streaks.current,
      longestStreakDays: streaks.longest,
      topTracks: Array.from(trackMap.values())
        .sort((a, b) => b.plays - a.plays || b.totalMs - a.totalMs)
        .slice(0, 10),
      topArtists: Array.from(artistMap.values())
        .sort((a, b) => b.plays - a.plays || b.totalMs - a.totalMs)
        .slice(0, 10)
        .map((a) => ({
          artist: a.artist,
          albumArt: a.albumArt,
          plays: a.plays,
          totalMs: a.totalMs,
          trackCount: a.tracks.size,
        })),
      topAlbums: Array.from(albumMap.values())
        .sort((a, b) => b.plays - a.plays || b.totalMs - a.totalMs)
        .slice(0, 10),
      activityDays,
      hourlyDistribution: hourly,
      telemetry: {
        avgBitrateKbps,
        opusItag251Pct: opusPct,
        aacItag140Pct: aacPct,
        preferredSpeed: 1,
      },
      connectedServices: {
        youtubeExtension: rows.length > 0,
        spotify: Boolean(spotifyRow),
      },
      memberSince: userRow?.createdAt ? userRow.createdAt.toISOString() : null,
    };

    await cache.set(key, JSON.stringify(payload), CACHE_TTL_SEC);
    return payload;
  });
};
