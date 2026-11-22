export const DEFAULT_APP_ORIGINS = [
  "http://localhost",
  "http://127.0.0.1",
  "http://35.154.36.24.nip.io",
  "https://35.154.36.24.nip.io",
] as const;

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

export interface SenderInfo {
  origin?: string;
  url?: string;
}

function normalizeOrigin(entry: string): string {
  let url: URL;
  try {
    url = new URL(entry);
  } catch {
    throw new Error(`Invalid app origin "${entry}" in VITE_APP_ORIGINS`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`App origin "${entry}" in VITE_APP_ORIGINS must use http or https`);
  }
  return url.origin;
}

/**
 * Default app origins plus the comma separated extras from VITE_APP_ORIGINS.
 * An entry without a port matches any port for loopback hosts only.
 */
export function parseAppOrigins(extra?: string): string[] {
  const extras = (extra ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
  return [...new Set<string>([...DEFAULT_APP_ORIGINS, ...extras])];
}

export function isAllowedOrigin(origin: string | undefined, allowed: readonly string[]): boolean {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;

  return allowed.some((entry) => {
    const allowedUrl = new URL(entry);
    if (allowedUrl.protocol !== url.protocol || allowedUrl.hostname !== url.hostname) {
      return false;
    }
    return (
      allowedUrl.port === url.port ||
      (allowedUrl.port === "" && LOOPBACK_HOSTNAMES.has(allowedUrl.hostname))
    );
  });
}

/** Match patterns for content_scripts and externally_connectable (host based, any port). */
export function toMatchPatterns(origins: readonly string[]): string[] {
  const patterns = origins.map((origin) => {
    const url = new URL(origin);
    return `${url.protocol}//${url.hostname}/*`;
  });
  return [...new Set(patterns)];
}

/** Origin of a URL, also for extension schemes where URL.origin is not always populated. */
export function originOf(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

export function getSenderOrigin(sender: SenderInfo | undefined): string | null {
  if (sender?.origin && sender.origin !== "null") return sender.origin;
  if (sender?.url) return originOf(sender.url);
  return null;
}

/** The extension's own pages and allowed app origins may talk to the background script. */
export function isAllowedSender(
  sender: SenderInfo | undefined,
  extensionOrigin: string,
  allowed: readonly string[],
): boolean {
  const origin = getSenderOrigin(sender);
  if (origin === null) return false;
  return origin === extensionOrigin || isAllowedOrigin(origin, allowed);
}
