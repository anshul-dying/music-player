import { z } from "zod";

// ---- Shared identity types ----

export const videoIdSchema = z.string().min(1).max(32);

export const trackSchema = z.object({
  videoId: videoIdSchema,
  title: z.string(),
  artist: z.string(),
  albumArt: z.string().url().nullable(),
  durationMs: z.number().int().nonnegative(),
});
export type Track = z.infer<typeof trackSchema>;

// ---- Playlists ----

export const playlistSourceSchema = z.enum(["local", "spotify", "youtube"]);

export const playlistSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  source: playlistSourceSchema,
  trackCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type Playlist = z.infer<typeof playlistSchema>;

export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(200),
});
export const addTracksSchema = z.object({
  tracks: z.array(trackSchema).min(1).max(100),
  position: z.number().int().nonnegative().optional(),
});

// ---- Likes / history ----

export const likeSchema = z.object({
  videoId: videoIdSchema,
  title: z.string(),
  artist: z.string(),
  albumArt: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type Like = z.infer<typeof likeSchema>;

export const historyEntrySchema = z.object({
  videoId: videoIdSchema,
  playedAt: z.string().datetime(),
  msPlayed: z.number().int().nonnegative(),
});
export type HistoryEntry = z.infer<typeof historyEntrySchema>;

// ---- Import ----

export const importRequestSchema = z.object({
  kind: z.enum(["liked_songs", "playlists"]),
});
export const importStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["queued", "running", "done", "failed"]),
  progress: z.number().min(0).max(1),
  matched: z.number().int().nonnegative(),
  ambiguous: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
});
export type ImportStatus = z.infer<typeof importStatusSchema>;

// ---- Lyrics ----

export const lyricWordSchema = z.object({
  time: z.number(),
  text: z.string(),
});
export type LyricWord = z.infer<typeof lyricWordSchema>;

export const lyricLineSchema = z.object({
  time: z.number(),
  timeMs: z.number().int().nonnegative().optional().nullable(),
  text: z.string(),
  words: z.array(lyricWordSchema).optional(),
});
export type LyricLine = z.infer<typeof lyricLineSchema>;

export const lyricsResponseSchema = z.object({
  videoId: videoIdSchema,
  synced: z.boolean(),
  // LRC-format lines; empty when unsynced/plain
  lines: z.array(lyricLineSchema),
  plainLyrics: z.string().optional(),
  source: z.string(),
});
export type LyricsResponse = z.infer<typeof lyricsResponseSchema>;

export * from "./profile.js";
