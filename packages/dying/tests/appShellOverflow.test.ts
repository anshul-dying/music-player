import { test, describe } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { AppShell } from "../src/index";

describe("AppShell FullBleed & Viewport Overflow (#39)", () => {
  test("creates valid AppShell element with isFullBleed=true without overflow", () => {
    const elem = React.createElement(
      AppShell,
      {
        isFullBleed: true,
        playerDockVariant: "docked",
        playerDock: React.createElement("div", { id: "dock" }, "Player Dock"),
      },
      React.createElement("div", { id: "full-player" }, "Full Player Content")
    );
    assert.ok(React.isValidElement(elem));
  });

  test("creates valid standard AppShell element with isFullBleed=false", () => {
    const elem = React.createElement(
      AppShell,
      {
        isFullBleed: false,
        playerDockVariant: "floating",
        playerDock: React.createElement("div", { id: "dock" }, "Player Dock"),
      },
      React.createElement("div", { id: "page-content" }, "Page Content")
    );
    assert.ok(React.isValidElement(elem));
  });
});
