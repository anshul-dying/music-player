import { Redis } from "ioredis";
import { Worker } from "bullmq";
import {
  insertImportedLike,
  insertImportedPlaylist,
  updateImportJob,
} from "@mp/db";
import {
  fetchPublicSpotifyPlaylist,
  fetchSpotifyLikedTracks,
  fetchSpotifyPlaylistsWithTracks,
  getWorkerSpotifyToken,
  type SpotifyTrackItem,
} from "./spotifyApi.js";
import { matchSpotifyTrack, type MatchedYtTrack } from "./matcher.js";

interface ImportJobPayload {
  jobId: string;
  userId: string;
  kind: "liked_songs" | "playlists";
  playlistIds?: string[];
  playlistUrl?: string;
}

async function publishProgress(
  pub: Redis,
  jobId: string,
  payload: {
    status?: "queued" | "running" | "done" | "failed";
    progress?: number;
    stats?: Record<string, unknown>;
    error?: string | null;
  }
) {
  await updateImportJob(jobId, payload);
  await pub
    .publish(`import:progress:${jobId}`, JSON.stringify({ id: jobId, ...payload }))
    .catch(() => {});
}

async function matchInBatches(
  tracks: SpotifyTrackItem[],
  onStep: (done: number, matchedSoFar: number, unmatchedSoFar: number) => Promise<void>
) {
  const matched: Array<{ source: SpotifyTrackItem; yt: MatchedYtTrack }> = [];
  const unmatched: string[] = [];

  for (let i = 0; i < tracks.length; i += 3) {
    const batch = tracks.slice(i, i + 3);
    const resolved = await Promise.all(
      batch.map(async (source) => ({ source, yt: await matchSpotifyTrack(source) }))
    );
    for (const item of resolved) {
      if (item.yt) matched.push({ source: item.source, yt: item.yt });
      else unmatched.push(`${item.source.title} — ${item.source.artist}`);
    }
    await onStep(Math.min(tracks.length, i + batch.length), matched.length, unmatched.length);
  }

  return { matched, unmatched };
}

async function processImportJob(pub: Redis, data: ImportJobPayload) {
  const { jobId, userId, kind, playlistIds, playlistUrl } = data;

  await publishProgress(pub, jobId, {
    status: "running",
    progress: 0,
    stats: { total: 0, matched: 0, unmatched: 0 },
  });

  let totalTracks = 0;
  let matchedCount = 0;
  const unmatchedTracks: string[] = [];

  if (kind === "liked_songs" && !playlistUrl) {
    const accessToken = await getWorkerSpotifyToken(userId);
    const tracks = await fetchSpotifyLikedTracks(accessToken);
    totalTracks = tracks.length;

    const { matched, unmatched } = await matchInBatches(tracks, async (done, mCount, uCount) => {
      const pct = totalTracks > 0 ? Math.round((done / totalTracks) * 95) : 95;
      await publishProgress(pub, jobId, {
        status: "running",
        progress: pct,
        stats: { total: totalTracks, processed: done, matched: mCount, unmatched: uCount },
      });
    });

    for (const { source, yt } of matched) {
      await insertImportedLike({
        userId,
        videoId: yt.videoId,
        title: yt.title || source.title,
        artist: yt.artist || source.artist,
        albumArt: yt.thumbnail || source.albumArt,
      });
    }

    matchedCount = matched.length;
    unmatchedTracks.push(...unmatched);
  } else {
    const playlists = playlistUrl
      ? [await fetchPublicSpotifyPlaylist(playlistUrl)]
      : await fetchSpotifyPlaylistsWithTracks(await getWorkerSpotifyToken(userId), playlistIds);
    totalTracks = playlists.reduce((acc, pl) => acc + pl.tracks.length, 0);
    let processed = 0;

    for (const pl of playlists) {
      const { matched, unmatched } = await matchInBatches(pl.tracks, async (done, mCount, uCount) => {
        const overall = processed + done;
        const pct = totalTracks > 0 ? Math.round((overall / totalTracks) * 95) : 95;
        await publishProgress(pub, jobId, {
          status: "running",
          progress: pct,
          stats: {
            total: totalTracks,
            processed: overall,
            matched: matchedCount + mCount,
            unmatched: unmatchedTracks.length + uCount,
          },
        });
      });

      processed += pl.tracks.length;
      matchedCount += matched.length;
      unmatchedTracks.push(...unmatched);

      await insertImportedPlaylist(
        {
          userId,
          name: pl.name,
          description: pl.description,
          coverArt: pl.coverUrl,
        },
        matched.map(({ source, yt }) => ({
          videoId: yt.videoId,
          title: yt.title || source.title,
          artist: yt.artist || source.artist,
          albumArt: yt.thumbnail || source.albumArt,
          durationMs: yt.durationSec ? yt.durationSec * 1000 : source.durationMs,
        }))
      );
    }
  }

  await publishProgress(pub, jobId, {
    status: "done",
    progress: 100,
    stats: {
      total: totalTracks,
      matched: matchedCount,
      unmatched: unmatchedTracks.length,
      unmatchedTracks: unmatchedTracks.slice(0, 50),
    },
  });
}

async function main() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[worker] REDIS_URL not set — exiting.");
    process.exit(0);
  }

  const pub = new Redis(redisUrl);
  const worker = new Worker<ImportJobPayload>(
    "spotify-import",
    async (job) => {
      try {
        await processImportJob(pub, job.data);
        return { ok: true };
      } catch (err: any) {
        await publishProgress(pub, job.data.jobId, {
          status: "failed",
          progress: 0,
          error: err?.message || "import_failed",
        });
        throw err;
      }
    },
    { connection: { url: redisUrl }, concurrency: 4 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[spotify-import] job ${job?.id} failed:`, err.message);
  });

  console.log("worker running: spotify-import");
}

void main();
