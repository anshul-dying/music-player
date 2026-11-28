import { z } from "zod";

const videoIdSchema = z.string().min(1).max(32);

export const profileStatsRangeSchema = z.enum(["7d", "30d", "1y", "all"]);
export type ProfileStatsRange = z.infer<typeof profileStatsRangeSchema>;

export const profileTopTrackSchema = z.object({
  videoId: videoIdSchema,
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  albumArt: z.string().nullable(),
  durationSec: z.number().int().nonnegative(),
  plays: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
});
export type ProfileTopTrack = z.infer<typeof profileTopTrackSchema>;

export const profileTopArtistSchema = z.object({
  artist: z.string(),
  albumArt: z.string().nullable(),
  plays: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
  trackCount: z.number().int().nonnegative(),
});
export type ProfileTopArtist = z.infer<typeof profileTopArtistSchema>;

export const profileTopAlbumSchema = z.object({
  album: z.string(),
  artist: z.string(),
  albumArt: z.string().nullable(),
  videoId: videoIdSchema,
  plays: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
});
export type ProfileTopAlbum = z.infer<typeof profileTopAlbumSchema>;

export const profileActivityDaySchema = z.object({
  date: z.string(),
  count: z.number().int().nonnegative(),
});
export type ProfileActivityDay = z.infer<typeof profileActivityDaySchema>;

export const profileHourlyBucketSchema = z.object({
  hour: z.number().int().min(0).max(23),
  label: z.string(),
  count: z.number().int().nonnegative(),
  totalMs: z.number().int().nonnegative(),
});
export type ProfileHourlyBucket = z.infer<typeof profileHourlyBucketSchema>;

export const profileTelemetrySchema = z.object({
  avgBitrateKbps: z.number().nonnegative(),
  opusItag251Pct: z.number().min(0).max(100),
  aacItag140Pct: z.number().min(0).max(100),
  preferredSpeed: z.number().positive(),
});
export type ProfileTelemetry = z.infer<typeof profileTelemetrySchema>;

export const profileStatsResponseSchema = z.object({
  range: profileStatsRangeSchema,
  totalListeningSec: z.number().int().nonnegative(),
  totalStreams: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
  uniqueAlbums: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  longestStreakDays: z.number().int().nonnegative(),
  topTracks: z.array(profileTopTrackSchema),
  topArtists: z.array(profileTopArtistSchema),
  topAlbums: z.array(profileTopAlbumSchema),
  activityDays: z.array(profileActivityDaySchema),
  hourlyDistribution: z.array(profileHourlyBucketSchema),
  telemetry: profileTelemetrySchema,
  connectedServices: z.object({
    youtubeExtension: z.boolean(),
    spotify: z.boolean(),
  }),
  memberSince: z.string().nullable(),
});
export type ProfileStatsResponse = z.infer<typeof profileStatsResponseSchema>;
