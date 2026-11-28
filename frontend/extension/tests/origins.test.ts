import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_APP_ORIGINS,
  getSenderOrigin,
  isAllowedOrigin,
  isAllowedSender,
  originOf,
  parseAppOrigins,
  toMatchPatterns,
} from "../src/security/origins";

const PROD = "https://43.204.82.8.nip.io";
const EXTENSION_ORIGIN = "chrome-extension://abcdefghijklmnop";

describe("parseAppOrigins", () => {
  it("returns the defaults when no extras are given", () => {
    assert.deepEqual(parseAppOrigins(), [...DEFAULT_APP_ORIGINS]);
    assert.deepEqual(parseAppOrigins(""), [...DEFAULT_APP_ORIGINS]);
    assert.deepEqual(parseAppOrigins(" , ,"), [...DEFAULT_APP_ORIGINS]);
  });

  it("adds trimmed, normalized extras and drops duplicates", () => {
    const origins = parseAppOrigins(" https://music.example.com/ , http://localhost , https://music.example.com ");
    assert.deepEqual(origins, [...DEFAULT_APP_ORIGINS, "https://music.example.com"]);
  });

  it("throws on invalid or non http(s) entries so a bad build fails loudly", () => {
    assert.throws(() => parseAppOrigins("not a url"), /Invalid app origin/);
    assert.throws(() => parseAppOrigins("ftp://example.com"), /must use http or https/);
  });
});

describe("isAllowedOrigin", () => {
  const allowed = parseAppOrigins();

  it("allows localhost and 127.0.0.1 on any port", () => {
    assert.equal(isAllowedOrigin("http://localhost", allowed), true);
    assert.equal(isAllowedOrigin("http://localhost:3000", allowed), true);
    assert.equal(isAllowedOrigin("http://127.0.0.1:4000", allowed), true);
  });

  it("allows the production host on https and http", () => {
    assert.equal(isAllowedOrigin(PROD, allowed), true);
    assert.equal(isAllowedOrigin("http://43.204.82.8.nip.io", allowed), true);
  });

  it("rejects public wildcard hosting and look-alike hosts", () => {
    for (const origin of [
      "https://evil.nip.io",
      "https://43.204.82.8.nip.io.evil.com",
      "https://evil.43.204.82.8.nip.io",
      "https://evil.vercel.app",
      "https://evil.pages.dev",
      "http://localhost.evil.com",
      "http://evil.com",
      "https://localhost",
    ]) {
      assert.equal(isAllowedOrigin(origin, allowed), false, origin);
    }
  });

  it("rejects the wrong scheme or port for non loopback hosts", () => {
    assert.equal(isAllowedOrigin("https://43.204.82.8.nip.io:8443", allowed), false);
    assert.equal(isAllowedOrigin("http://43.204.82.8.nip.io:8080", allowed), false);
  });

  it("rejects values that are not a bare origin", () => {
    for (const value of [undefined, "", "null", "localhost", "http://localhost/path", "http://localhost?x=1"]) {
      assert.equal(isAllowedOrigin(value, allowed), false, String(value));
    }
  });

  it("matches extra origins exactly, including their port", () => {
    const extended = parseAppOrigins("https://music.example.com:8443");
    assert.equal(isAllowedOrigin("https://music.example.com:8443", extended), true);
    assert.equal(isAllowedOrigin("https://music.example.com", extended), false);
    assert.equal(isAllowedOrigin("https://other.example.com:8443", extended), false);
  });
});

describe("toMatchPatterns", () => {
  it("builds host based patterns without public wildcards", () => {
    const patterns = toMatchPatterns(parseAppOrigins("https://music.example.com:8443, http://localhost:3000"));
    assert.deepEqual(patterns, [
      "http://localhost/*",
      "http://127.0.0.1/*",
      "http://43.204.82.8.nip.io/*",
      "https://43.204.82.8.nip.io/*",
      "https://music.example.com/*",
    ]);
    assert.equal(patterns.some((p) => p.includes("*.") || p.includes("<all_urls>")), false);
  });
});

describe("originOf", () => {
  it("returns the origin for web and extension URLs", () => {
    assert.equal(originOf("http://localhost:3000/library?x=1"), "http://localhost:3000");
    assert.equal(originOf("https://43.204.82.8.nip.io/"), PROD);
    assert.equal(originOf(`${EXTENSION_ORIGIN}/popup.html`), EXTENSION_ORIGIN);
    assert.equal(originOf("moz-extension://1234-abcd/"), "moz-extension://1234-abcd");
  });

  it("returns null for values that are not URLs", () => {
    assert.equal(originOf("not a url"), null);
    assert.equal(originOf(""), null);
  });
});

describe("getSenderOrigin / isAllowedSender", () => {
  const allowed = parseAppOrigins();

  it("prefers sender.origin and falls back to the origin of sender.url", () => {
    assert.equal(getSenderOrigin({ origin: "http://localhost:3000", url: "https://evil.com/x" }), "http://localhost:3000");
    assert.equal(getSenderOrigin({ url: "http://localhost:3000/library?x=1" }), "http://localhost:3000");
    assert.equal(getSenderOrigin({ origin: "null" }), null);
    assert.equal(getSenderOrigin({ url: "not a url" }), null);
    assert.equal(getSenderOrigin(undefined), null);
  });

  it("allows app origins and the extension's own pages", () => {
    assert.equal(isAllowedSender({ origin: PROD }, EXTENSION_ORIGIN, allowed), true);
    assert.equal(isAllowedSender({ url: "http://127.0.0.1:3000/" }, EXTENSION_ORIGIN, allowed), true);
    assert.equal(isAllowedSender({ url: `${EXTENSION_ORIGIN}/popup.html` }, EXTENSION_ORIGIN, allowed), true);
  });

  it("rejects other origins, other extensions and senders without an origin", () => {
    assert.equal(isAllowedSender({ origin: "https://evil.com" }, EXTENSION_ORIGIN, allowed), false);
    assert.equal(isAllowedSender({ url: "https://evil.nip.io/" }, EXTENSION_ORIGIN, allowed), false);
    assert.equal(isAllowedSender({ origin: "chrome-extension://other" }, EXTENSION_ORIGIN, allowed), false);
    assert.equal(isAllowedSender({}, EXTENSION_ORIGIN, allowed), false);
    assert.equal(isAllowedSender(undefined, EXTENSION_ORIGIN, allowed), false);
  });
});
