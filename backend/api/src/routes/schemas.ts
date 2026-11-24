import { z } from "zod";

/** Error codes the API returned before schemas existed; clients may match on them. */
const LEGACY_CODES = new Set([
  "name_required",
  "tracks_required",
  "videoId_required",
  "title_artist_required",
]);

const MAX_MS_PLAYED = 24 * 60 * 60 * 1000;

/** String that reports `code` when the field is missing, and the default zod message otherwise. */
const required = (code: string) =>
  z.string({ error: (iss) => (iss.input === undefined ? code : undefined) });

const videoId = required("videoId_required").min(1, "videoId_required").max(64);
const url = z.string().max(2048);

export const idParams = z.object({ id: z.uuid() });
export const videoIdParams = z.object({ videoId });
export const playlistTrackParams = z.object({ id: z.uuid(), videoId });

export const createPlaylistBody = z.object({
  name: required("name_required").trim().min(1, "name_required").max(200),
  description: z.string().max(2000).nullish(),
  coverArt: url.nullish(),
  source: z.enum(["local", "youtube"]).optional(),
  ytPlaylistId: z.string().max(64).nullish(),
});

const trackInput = z.object({
  videoId,
  title: z.string().min(1).max(500),
  artist: z.string().min(1).max(500),
  albumArt: url.nullish(),
  durationMs: z.number().int().min(0).max(MAX_MS_PLAYED).optional(),
});

export const addTracksBody = z.object({
  tracks: z
    .array(trackInput, {
      error: (iss) => (iss.input === undefined ? "tracks_required" : undefined),
    })
    .min(1, "tracks_required")
    .max(200),
  position: z.number().int().min(0).optional(),
});

export const likeBody = z.object({
  title: required("title_artist_required").min(1, "title_artist_required").max(500),
  artist: required("title_artist_required").min(1, "title_artist_required").max(500),
  albumArt: url.nullish(),
});

export const historyBody = z
  .object({
    videoId,
    msPlayed: z.number().int().min(0).max(MAX_MS_PLAYED).default(0),
    title: z.string().min(1).max(500).optional(),
    artist: z.string().min(1).max(500).optional(),
    albumArt: url.nullish(),
    durationSec: z.number().int().min(0).max(MAX_MS_PLAYED / 1000).optional(),
  })
  .refine((body) => (body.title === undefined) === (body.artist === undefined), {
    message: "title_artist_required",
    path: ["title"],
  });

export const importBody = z.object({
  kind: z.enum(["liked_songs", "playlists"]).default("liked_songs"),
  playlistIds: z.array(z.string().min(1).max(64)).max(50).optional(),
});

export class InvalidRequestError extends Error {
  readonly statusCode = 400;

  constructor(readonly error: z.ZodError) {
    super("invalid_request");
  }

  toBody() {
    const first = this.error.issues[0];
    return {
      statusCode: this.statusCode,
      error: first && LEGACY_CODES.has(first.message) ? first.message : "invalid_request",
      issues: this.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
}

export function parseRequest<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new InvalidRequestError(result.error);
  return result.data;
}
