import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getHighResArtworkUrl } from "../src/utils/artwork";

describe("getHighResArtworkUrl", () => {
  test("handles empty, null, or undefined URLs", () => {
    assert.equal(getHighResArtworkUrl(""), "");
    assert.equal(getHighResArtworkUrl(null), "");
    assert.equal(getHighResArtworkUrl(undefined), "");
    assert.equal(getHighResArtworkUrl(false as any), "");
  });

  test("upgrades googleusercontent URLs with width/height params", () => {
    const original60 = "https://lh3.googleusercontent.com/abc=w60-h60-l90-rj";
    assert.equal(
      getHighResArtworkUrl(original60, 1024),
      "https://lh3.googleusercontent.com/abc=w1024-h1024-l90-rj"
    );

    const original120 = "https://lh3.googleusercontent.com/xyz=w120-h120-l90-rj";
    assert.equal(
      getHighResArtworkUrl(original120, 544),
      "https://lh3.googleusercontent.com/xyz=w544-h544-l90-rj"
    );

    const defaultSize = "https://lh3.googleusercontent.com/xyz=w120-h120-l90-rj";
    assert.equal(
      getHighResArtworkUrl(defaultSize),
      "https://lh3.googleusercontent.com/xyz=w1024-h1024-l90-rj"
    );
  });

  test("upgrades googleusercontent URLs with square size param (=s120-c)", () => {
    const square120 = "https://lh3.googleusercontent.com/def=s120-c";
    assert.equal(
      getHighResArtworkUrl(square120, 1024),
      "https://lh3.googleusercontent.com/def=w1024-h1024-l90-rj"
    );
  });

  test("upgrades ggpht channel/artist artwork URLs", () => {
    const ggpht = "https://yt3.ggpht.com/avatar=s176-c-k-c0x00ffffff-no-rj";
    assert.equal(
      getHighResArtworkUrl(ggpht, 1024),
      "https://yt3.ggpht.com/avatar=w1024-h1024-l90-rj"
    );
  });

  test("preserves query parameters on googleusercontent URLs", () => {
    const withQuery = "https://lh3.googleusercontent.com/hash=w60-h60?sqp=some_sqp_token";
    assert.equal(
      getHighResArtworkUrl(withQuery, 1024),
      "https://lh3.googleusercontent.com/hash=w1024-h1024-l90-rj?sqp=some_sqp_token"
    );

    const noParamWithQuery = "https://lh3.googleusercontent.com/hash?sqp=123";
    assert.equal(
      getHighResArtworkUrl(noParamWithQuery, 1024),
      "https://lh3.googleusercontent.com/hash=w1024-h1024-l90-rj?sqp=123"
    );
  });

  test("upgrades YouTube video thumbnails to maxresdefault", () => {
    const hqdefault = "https://i.ytimg.com/vi/xukbqwRUn5W/hqdefault.jpg";
    assert.equal(
      getHighResArtworkUrl(hqdefault),
      "https://i.ytimg.com/vi/xukbqwRUn5W/maxresdefault.jpg"
    );

    const mqdefault = "https://i.ytimg.com/vi/xukbqwRUn5W/mqdefault.jpg";
    assert.equal(
      getHighResArtworkUrl(mqdefault),
      "https://i.ytimg.com/vi/xukbqwRUn5W/maxresdefault.jpg"
    );

    const defaultJpg = "https://i.ytimg.com/vi/xukbqwRUn5W/default.jpg";
    assert.equal(
      getHighResArtworkUrl(defaultJpg),
      "https://i.ytimg.com/vi/xukbqwRUn5W/maxresdefault.jpg"
    );

    const webpThumbnail = "https://i.ytimg.com/vi_webp/xukbqwRUn5W/hqdefault.webp";
    assert.equal(
      getHighResArtworkUrl(webpThumbnail),
      "https://i.ytimg.com/vi_webp/xukbqwRUn5W/maxresdefault.webp"
    );

    const withQuery = "https://i.ytimg.com/vi/xukbqwRUn5W/hqdefault.jpg?sqp=abc123";
    assert.equal(
      getHighResArtworkUrl(withQuery),
      "https://i.ytimg.com/vi/xukbqwRUn5W/maxresdefault.jpg?sqp=abc123"
    );
  });

  test("leaves non-YouTube / custom artwork URLs unmodified", () => {
    const custom = "https://cdn.example.com/album-art/cover.png";
    assert.equal(getHighResArtworkUrl(custom), custom);

    const localAsset = "/images/local-cover.jpg";
    assert.equal(getHighResArtworkUrl(localAsset), localAsset);
  });
});
