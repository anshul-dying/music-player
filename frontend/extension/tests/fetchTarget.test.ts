import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseFetchTarget } from "../src/security/fetchTarget";

describe("parseFetchTarget", () => {
  it("allows https YouTube hosts", () => {
    for (const url of [
      "https://music.youtube.com/youtubei/v1/browse",
      "https://www.youtube.com/youtubei/v1/player?key=x",
      "https://youtube.com/",
    ]) {
      assert.equal(parseFetchTarget(url, null)?.kind, "youtube", url);
    }
  });

  it("allows https googlevideo hosts", () => {
    const target = parseFetchTarget("https://rr1---sn-abc.googlevideo.com/videoplayback?itag=251", null);
    assert.equal(target?.kind, "googlevideo");
  });

  it("rejects look-alike YouTube hosts", () => {
    for (const url of [
      "https://youtube.com.evil.com/",
      "https://evilyoutube.com/",
      "https://notyoutube.com/",
      "https://youtube.com.nip.io/",
      "https://googlevideo.com.evil.com/",
      "https://evilgooglevideo.com/",
      "https://youtube.com./",
    ]) {
      assert.equal(parseFetchTarget(url, null), null, url);
    }
  });

  it("rejects non https, custom ports and embedded credentials", () => {
    for (const url of [
      "http://www.youtube.com/",
      "https://www.youtube.com:8443/",
      "https://user:pass@www.youtube.com/",
      "ftp://www.youtube.com/",
    ]) {
      assert.equal(parseFetchTarget(url, null), null, url);
    }
  });

  it("rejects loopback, LAN, nip.io and other arbitrary hosts", () => {
    for (const url of [
      "http://localhost:3000/",
      "http://127.0.0.1:5432/",
      "https://192.168.1.1.nip.io/",
      "https://43.204.82.8.nip.io/",
      "https://example.com/",
      "not a url",
      "",
    ]) {
      assert.equal(parseFetchTarget(url, null), null, url);
    }
  });

  it("lets a page fetch its own origin only", () => {
    const own = "http://localhost:3000";
    assert.equal(parseFetchTarget("http://localhost:3000/api/yt/stream?url=x", own)?.kind, "app");
    assert.equal(parseFetchTarget("http://localhost:3001/", own), null);
    assert.equal(parseFetchTarget("http://localhost:3000/", null), null);
    assert.equal(parseFetchTarget("http://127.0.0.1:3000/", own), null);
    assert.equal(parseFetchTarget("http://localhost:3000@evil.com/", own), null);
  });
});
