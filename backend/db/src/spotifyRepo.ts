import { eq } from "drizzle-orm";
import { getDb, schema } from "./index.js";

export async function getSpotifyTokenByUserId(userId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.spotifyTokens)
    .where(eq(schema.spotifyTokens.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function updateSpotifyTokenByUserId(
  userId: string,
  values: {
    accessTokenEnc: string;
    refreshTokenEnc: string;
    expiresAt: Date;
    scope?: string | null;
  }
) {
  const db = getDb();
  await db
    .update(schema.spotifyTokens)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.spotifyTokens.userId, userId));
}

export async function updateImportJob(
  jobId: string,
  values: Partial<{
    status: "queued" | "running" | "done" | "failed";
    progress: number;
    stats: Record<string, unknown>;
    error: string | null;
  }>
) {
  const db = getDb();
  await db
    .update(schema.importJobs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(schema.importJobs.id, jobId));
}

export async function insertImportedLike(values: {
  userId: string;
  videoId: string;
  title: string;
  artist: string;
  albumArt: string | null;
}) {
  const db = getDb();
  await db.insert(schema.likes).values(values).onConflictDoNothing();
}

export async function insertImportedPlaylist(
  playlist: {
    userId: string;
    name: string;
    description: string | null;
    coverArt: string | null;
  },
  tracks: Array<{
    videoId: string;
    title: string;
    artist: string;
    albumArt: string | null;
    durationMs: number;
  }>
) {
  const db = getDb();
  const [created] = await db
    .insert(schema.playlists)
    .values({ ...playlist, source: "spotify" })
    .returning();

  for (let idx = 0; idx < tracks.length; idx += 1) {
    await db
      .insert(schema.playlistTracks)
      .values({ playlistId: created.id, ...tracks[idx], position: idx })
      .onConflictDoNothing();
  }
}
