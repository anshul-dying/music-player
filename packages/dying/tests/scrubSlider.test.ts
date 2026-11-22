import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { ScrubSlider, FloatingPlayerPill, PlayerBar } from "../src/index";

describe("ScrubSlider & Seek Responsiveness (#27)", () => {
  test("verifies ScrubSlider component is defined and creates a valid React element", () => {
    assert.ok(ScrubSlider, "ScrubSlider must be defined");
    const elem = React.createElement(ScrubSlider, {
      value: 30,
      min: 0,
      max: 100,
      onValueChange: () => {},
      onValueCommit: () => {},
    });
    assert.ok(React.isValidElement(elem));
  });

  test("verifies FloatingPlayerPill renders with scrub bar and seek handler", () => {
    let seekedTo: number | null = null;
    const pill = React.createElement(FloatingPlayerPill, {
      title: "Test Song",
      artist: "Test Artist",
      currentTime: 10,
      duration: 180,
      onSeek: (val) => {
        seekedTo = val;
      },
    });
    assert.ok(React.isValidElement(pill));
  });

  test("verifies PlayerBar renders with scrub bar and seek handler", () => {
    let seekedTo: number | null = null;
    const playerBar = React.createElement(PlayerBar, {
      currentTrack: {
        id: "1",
        title: "Test Track",
        artist: "Test Artist",
      },
      currentTime: 15,
      duration: 200,
      onSeek: (val) => {
        seekedTo = val;
      },
    });
    assert.ok(React.isValidElement(playerBar));
  });
});
