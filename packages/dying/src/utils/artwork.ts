/**
 * Transforms low-resolution YouTube/YouTube Music artwork thumbnails
 * into high-resolution images suitable for hero and full-screen displays.
 *
 * - Google usercontent / ggpht: replaces `=w...` or `=s...` with `=w{size}-h{size}-l90-rj`
 * - YouTube Video Thumbnails: replaces `(default|mqdefault|hqdefault|sddefault)` with `maxresdefault`
 */
export function getHighResArtworkUrl(url?: string | null, size = 1024): string {
  if (!url || typeof url !== "string") return "";

  // 1. Google usercontent / ggpht (YouTube Music album art, artist art, profile)
  if (/googleusercontent\.com|ggpht\.com/i.test(url)) {
    if (/=w\d+-h\d+|=s\d+/i.test(url)) {
      return url.replace(/(=w\d+-h\d+[^?#]*|=s\d+[^?#]*)/i, `=w${size}-h${size}-l90-rj`);
    }
    const [base, query] = url.split("?");
    return `${base}=w${size}-h${size}-l90-rj${query ? "?" + query : ""}`;
  }

  // 2. YouTube video thumbnails (i.ytimg.com, img.youtube.com)
  if (/ytimg\.com|youtube\.com/i.test(url)) {
    return url.replace(
      /\/(default|mqdefault|hqdefault|sddefault)\.(jpg|jpeg|webp)(\?.*)?$/i,
      "/maxresdefault.$2$3"
    );
  }

  return url;
}
