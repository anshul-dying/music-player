import { Queue } from "bullmq";

export interface SpotifyImportJobData {
  jobId: string;
  userId: string;
  kind: "liked_songs" | "playlists";
  playlistIds?: string[];
  playlistUrl?: string;
}

let importQueue: Queue<SpotifyImportJobData> | null = null;

export function getImportQueue(): Queue<SpotifyImportJobData> | null {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (!importQueue) {
    importQueue = new Queue<SpotifyImportJobData>("spotify-import", {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      },
    });
  }

  return importQueue;
}

export async function closeImportQueue(): Promise<void> {
  if (importQueue) {
    try {
      await importQueue.close();
    } catch {
      // Ignore close errors on shutdown
    } finally {
      importQueue = null;
    }
  }
}
