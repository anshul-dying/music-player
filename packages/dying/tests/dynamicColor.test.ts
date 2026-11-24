import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  extractDynamicPalette,
  computeDynamicPaletteFromHex,
  getContrastRatio,
  rgbToOklch,
  oklchToRgb,
} from "../src/tokens/dynamicColor";

const THEME_SURFACES = {
  dark: { canvas: "#141416", surface: "#1e1e22" },
  oled: { canvas: "#000000", surface: "#101012" },
  light: { canvas: "#f7f7f8", surface: "#ffffff" },
} as const;

describe("Dynamic Color & OKLCH Contrast System", () => {
  test("getContrastRatio computes WCAG 2.1 ratios accurately", () => {
    assert.ok(Math.abs(getContrastRatio("#ffffff", "#000000") - 21) < 0.01);
    assert.strictEqual(getContrastRatio("#ffffff", "#ffffff"), 1);
    assert.strictEqual(
      getContrastRatio("#FF6A4D", "#1e1e22"),
      getContrastRatio("#1e1e22", "#FF6A4D")
    );
  });

  test("rgbToOklch and oklchToRgb round-trip within 1 LSB", () => {
    const samples: [number, number, number][] = [
      [255, 106, 77],
      [59, 130, 246],
      [34, 197, 94],
      [250, 204, 21],
    ];
    for (const [r, g, b] of samples) {
      const oklch = rgbToOklch(r, g, b);
      const [rr, gg, bb] = oklchToRgb(oklch.l, oklch.c, oklch.h);
      assert.ok(Math.abs(r - rr) <= 1, `R mismatch for ${r}: ${rr}`);
      assert.ok(Math.abs(g - gg) <= 1, `G mismatch for ${g}: ${gg}`);
      assert.ok(Math.abs(b - bb) <= 1, `B mismatch for ${b}: ${bb}`);
    }
  });

  test("computeDynamicPaletteFromHex guarantees >= 4.5:1 contrast across all themes", () => {
    const seeds = ["#050510", "#ffff00", "#ff6a4d", "#3b82f6", "#808080", "#10b981"];
    const themes = ["dark", "oled", "light"] as const;

    for (const theme of themes) {
      const { canvas, surface } = THEME_SURFACES[theme];
      for (const seed of seeds) {
        const palette = computeDynamicPaletteFromHex(seed, theme);
        const vsCanvas = getContrastRatio(palette.brandPrimary, canvas);
        const vsSurface = getContrastRatio(palette.brandPrimary, surface);
        const onPrimaryContrast = getContrastRatio(
          palette.brandPrimary,
          palette.brandOnPrimary
        );

        assert.ok(
          vsCanvas >= 4.5,
          `${theme} ${seed}: primary ${palette.brandPrimary} vs canvas ${canvas} = ${vsCanvas}`
        );
        assert.ok(
          vsSurface >= 4.5,
          `${theme} ${seed}: primary ${palette.brandPrimary} vs surface ${surface} = ${vsSurface}`
        );
        assert.ok(
          palette.brandOnPrimary === "#ffffff" || palette.brandOnPrimary === "#000000"
        );
        assert.ok(
          onPrimaryContrast >= 4.5,
          `${theme} ${seed}: onPrimary ${palette.brandOnPrimary} vs ${palette.brandPrimary} = ${onPrimaryContrast}`
        );
      }
    }
  });

  test("extractDynamicPalette returns deterministic fallback and exercises LRU cache", async () => {
    const p1 = await extractDynamicPalette("https://example.com/album-a.jpg", "dark");
    const p2 = await extractDynamicPalette("https://example.com/album-a.jpg", "dark");
    const p3 = await extractDynamicPalette("https://example.com/album-b.jpg", "dark");

    assert.deepStrictEqual(p1, p2);
    assert.notStrictEqual(p1.brandPrimary, p3.brandPrimary);

    // Populate > 50 entries to exercise LRU eviction
    for (let i = 0; i < 60; i++) {
      const palette = await extractDynamicPalette(`https://example.com/track-${i}.jpg`, "oled");
      assert.ok(getContrastRatio(palette.brandPrimary, THEME_SURFACES.oled.surface) >= 4.5);
    }
  });

  test("extractDynamicPalette handles CORS-tainted canvas gracefully", async () => {
    const origDocument = globalThis.document;
    const origImage = globalThis.Image;

    class MockImage {
      crossOrigin: string | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    (globalThis as unknown as { Image: typeof MockImage }).Image = MockImage;
    (globalThis as unknown as { document: unknown }).document = {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: () => {},
          getImageData: () => {
            throw new DOMException("Tainted canvas", "SecurityError");
          },
        }),
      }),
    };

    try {
      const palette = await extractDynamicPalette("https://cors-blocked.example/art.png", "light");
      assert.ok(getContrastRatio(palette.brandPrimary, THEME_SURFACES.light.surface) >= 4.5);
    } finally {
      (globalThis as unknown as { document: typeof origDocument }).document = origDocument;
      (globalThis as unknown as { Image: typeof origImage }).Image = origImage;
    }
  });

  test("elevation-and-states.css and theme.css expose required tokens and rules", () => {
    const pkgDir = path.resolve(import.meta.dirname, "..");
    const elevCss = fs.readFileSync(
      path.join(pkgDir, "src/styles/elevation-and-states.css"),
      "utf8"
    );
    const themeCss = fs.readFileSync(path.join(pkgDir, "theme.css"), "utf8");

    for (const token of [
      "--surface-0",
      "--surface-1",
      "--surface-2",
      "--surface-3",
      "--surface-4",
      "--brand-on-primary",
      "--surface-tint",
      "--state-hover",
      "--state-pressed",
      "--state-focus",
      '[data-reduce-transparency="true"]',
      ".dying-touch-target",
    ]) {
      assert.ok(elevCss.includes(token), `elevation-and-states.css missing ${token}`);
    }

    assert.ok(themeCss.includes('./src/styles/elevation-and-states.css'));
    for (const themeToken of [
      "--color-surface-0",
      "--color-surface-4",
      "--color-brand-on-primary",
      "--color-surface-tint",
    ]) {
      assert.ok(themeCss.includes(themeToken), `theme.css missing ${themeToken}`);
    }
  });
});
