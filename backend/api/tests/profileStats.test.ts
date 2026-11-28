import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { getDb, schema } from "@mp/db";
import { eq } from "drizzle-orm";
import { buildServer } from "../src/server.js";

describe("GET /api/profile/stats", () => {
  let app: FastifyInstance;
  let token = "";
  let userId = "";

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();

    const email = `stats-${Date.now()}@example.com`;
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name: "Stats User", email, password: "StrongPassword123!" },
    });
    assert.equal(signUp.statusCode, 200);
    const body = JSON.parse(signUp.body);
    token = body.token;
    userId = body.user.id;
  });

  after(async () => {
    if (userId) {
      const db = getDb();
      await db.delete(schema.user).where(eq(schema.user.id, userId));
    }
    await app.close();
  });

  it("rejects unauthenticated requests with 401 and invalid ranges with 400", async () => {
    const unauth = await app.inject({ method: "GET", url: "/api/profile/stats" });
    assert.equal(unauth.statusCode, 401);

    const badRange = await app.inject({
      method: "GET",
      url: "/api/profile/stats?range=99d",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(badRange.statusCode, 400);
  });

  it("returns empty stats cleanly for a new account", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/profile/stats?range=30d",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const data = JSON.parse(res.body);
    assert.equal(data.range, "30d");
    assert.equal(data.totalStreams, 0);
    assert.equal(data.totalListeningSec, 0);
    assert.equal(data.uniqueArtists, 0);
    assert.equal(data.currentStreakDays, 0);
    assert.equal(data.longestStreakDays, 0);
    assert.equal(data.activityDays.length, 365);
    assert.equal(data.hourlyDistribution.length, 24);
    assert.equal(data.topTracks.length, 0);
  });

  it("aggregates all 4 ranges and invalidates cache on POST /api/history", async () => {
    const db = getDb();
    const now = Date.now();
    const dayMs = 86_400_000;

    await db
      .insert(schema.tracks)
      .values([
        {
          videoId: "stat_trk_01",
          title: "Midnight Groove",
          artist: "Artist Alpha",
          album: "Night Sessions",
          durationSec: 210,
          preferredItag: 251,
        },
        {
          videoId: "stat_trk_02",
          title: "Solar Flare",
          artist: "Artist Beta",
          album: "Daylight",
          durationSec: 180,
          preferredItag: 140,
        },
      ])
      .onConflictDoNothing();

    await db.insert(schema.playHistory).values([
      { userId, videoId: "stat_trk_01", msPlayed: 200_000, playedAt: new Date(now - 1 * dayMs) },
      { userId, videoId: "stat_trk_01", msPlayed: 200_000, playedAt: new Date(now - 2 * dayMs) },
      { userId, videoId: "stat_trk_02", msPlayed: 180_000, playedAt: new Date(now - 15 * dayMs) },
      { userId, videoId: "stat_trk_02", msPlayed: 180_000, playedAt: new Date(now - 100 * dayMs) },
      { userId, videoId: "stat_trk_01", msPlayed: 120_000, playedAt: new Date(now - 450 * dayMs) },
    ]);

    // Trigger cache invalidation via POST /api/history
    const postRes = await app.inject({
      method: "POST",
      url: "/api/history",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        videoId: "stat_trk_01",
        msPlayed: 100_000,
        title: "Midnight Groove",
        artist: "Artist Alpha",
        durationSec: 210,
      },
    });
    assert.equal(postRes.statusCode, 201);

    const r7 = JSON.parse(
      (await app.inject({ method: "GET", url: "/api/profile/stats?range=7d", headers: { authorization: `Bearer ${token}` } })).body
    );
    assert.equal(r7.totalStreams, 3);
    assert.equal(r7.totalListeningSec, 500);
    assert.equal(r7.uniqueArtists, 1);

    const r30 = JSON.parse(
      (await app.inject({ method: "GET", url: "/api/profile/stats?range=30d", headers: { authorization: `Bearer ${token}` } })).body
    );
    assert.equal(r30.totalStreams, 4);
    assert.equal(r30.uniqueArtists, 2);

    const r1y = JSON.parse(
      (await app.inject({ method: "GET", url: "/api/profile/stats?range=1y", headers: { authorization: `Bearer ${token}` } })).body
    );
    assert.equal(r1y.totalStreams, 5);

    const rAll = JSON.parse(
      (await app.inject({ method: "GET", url: "/api/profile/stats?range=all", headers: { authorization: `Bearer ${token}` } })).body
    );
    assert.equal(rAll.totalStreams, 6);
    assert.equal(rAll.topTracks[0].videoId, "stat_trk_01");
    assert.equal(rAll.topTracks[0].plays, 4);
    assert.equal(rAll.topArtists[0].artist, "Artist Alpha");
    assert.equal(rAll.topAlbums[0].album, "Night Sessions");
    assert.ok(rAll.currentStreakDays >= 1);
    assert.ok(rAll.longestStreakDays >= 1);
    assert.equal(rAll.telemetry.opusItag251Pct + rAll.telemetry.aacItag140Pct, 100);
  });
});
