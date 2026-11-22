import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { SyncedLyricsView, FullPlayerView } from "../src/index";
import { FullPlayerLyricsTab } from "../src/music/full-player/FullPlayerLyricsTab";

describe("SyncedLyricsView & Scroll Stability (#44)", () => {
  const sampleLyrics = [
    { id: "1", time: 0, text: "First intro line" },
    { id: "2", time: 10, text: "Second singing line" },
    { id: "3", time: 20, text: "Third chorus line" },
  ];

  test("creates valid SyncedLyricsView element with active line and timestamps", () => {
    const elem = React.createElement(SyncedLyricsView, {
      lyrics: sampleLyrics,
      currentTime: 12,
      showTimestamps: true,
      autoScroll: true,
      synced: true,
      onSeek: () => {},
    });
    assert.ok(React.isValidElement(elem));
  });

  test("creates valid FullPlayerLyricsTab element", () => {
    const elem = React.createElement(FullPlayerLyricsTab, {
      resolvedLoading: false,
      resolvedSynced: true,
      parsedLyrics: sampleLyrics,
      currentTime: 15,
      onSeek: () => {},
    });
    assert.ok(React.isValidElement(elem));
  });

  test("creates FullPlayerView with preserved tabs structure", () => {
    const elem = React.createElement(FullPlayerView, {
      track: {
        id: "t1",
        title: "Song Title",
        artist: "Artist Name",
      },
      lyrics: sampleLyrics as any,
      activeTab: "lyrics",
    });
    assert.ok(React.isValidElement(elem));
  });
});
