import type { ResolvedTheme } from "./ThemeProvider";

export interface DynamicPalette {
  brandPrimary: string;
  brandOnPrimary: string;
  brandHover: string;
  brandSubtle: string;
  brandGlow: string;
  surfaceTint: string;
  auraPrimary: string;
  auraSecondary: string;
  auraTertiary: string;
}

interface Oklch {
  l: number;
  c: number;
  h: number;
}

const MAX_CACHE_ENTRIES = 50;
const paletteCache = new Map<string, DynamicPalette>();

const THEME_SURFACES: Record<ResolvedTheme, { canvas: string; surface: string }> = {
  dark: { canvas: "#141416", surface: "#1e1e22" },
  oled: { canvas: "#000000", surface: "#101012" },
  light: { canvas: "#f7f7f8", surface: "#ffffff" },
};

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearToSrgb(v: number): number {
  const clamped = clamp(v, 0, 1);
  const srgb =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  return Math.round(clamp(srgb * 255, 0, 255));
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) {
    return [255, 106, 77];
  }
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function rgbToOklch(r: number, g: number, b: number): Oklch {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const c = Math.sqrt(a * a + bOk * bOk);
  let h = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c, h };
}

export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const lr = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const lg = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const lb = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  return [linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb)];
}

function oklchToHex(l: number, c: number, h: number): string {
  const [r, g, b] = oklchToRgb(l, c, h);
  return rgbToHex(r, g, b);
}

function ensureAccessiblePrimary(base: Oklch, theme: ResolvedTheme): Oklch {
  const { canvas, surface } = THEME_SURFACES[theme];
  const isLight = theme === "light";
  const chroma = base.c < 0.03 ? 0.08 : clamp(base.c, 0.08, 0.20);
  let lightness = isLight ? clamp(base.l, 0.22, 0.55) : clamp(base.l, 0.62, 0.85);

  for (let i = 0; i < 40; i++) {
    const candidate = oklchToHex(lightness, chroma, base.h);
    const minContrast = Math.min(
      getContrastRatio(candidate, canvas),
      getContrastRatio(candidate, surface)
    );
    if (minContrast >= 4.5) break;
    lightness = isLight ? Math.max(0.15, lightness - 0.02) : Math.min(0.96, lightness + 0.02);
  }

  return { l: lightness, c: chroma, h: base.h };
}

export function computeDynamicPaletteFromHex(
  hex: string,
  resolvedTheme: ResolvedTheme
): DynamicPalette {
  const [r, g, b] = hexToRgb(hex);
  const baseOklch = rgbToOklch(r, g, b);
  const primary = ensureAccessiblePrimary(baseOklch, resolvedTheme);
  const brandPrimary = oklchToHex(primary.l, primary.c, primary.h);

  const whiteContrast = getContrastRatio(brandPrimary, "#ffffff");
  const blackContrast = getContrastRatio(brandPrimary, "#000000");
  const brandOnPrimary = whiteContrast >= blackContrast ? "#ffffff" : "#000000";

  const isLight = resolvedTheme === "light";
  const hoverL = isLight ? Math.max(0.15, primary.l - 0.06) : Math.min(0.96, primary.l + 0.06);
  const brandHover = oklchToHex(hoverL, primary.c, primary.h);

  const [pr, pg, pb] = hexToRgb(brandPrimary);
  const subtleAlpha = resolvedTheme === "oled" ? 0.2 : isLight ? 0.12 : 0.15;
  const glowAlpha = resolvedTheme === "oled" ? 0.3 : isLight ? 0.18 : 0.25;
  const tintAlpha = resolvedTheme === "oled" ? 0.1 : 0.08;

  const auraPrimary = oklchToHex(clamp(primary.l, 0.55, 0.72), clamp(primary.c, 0.12, 0.22), primary.h);
  const auraSecondary = oklchToHex(
    clamp(primary.l - 0.05, 0.45, 0.68),
    clamp(primary.c, 0.10, 0.20),
    (primary.h + 38) % 360
  );
  const auraTertiary = oklchToHex(
    clamp(primary.l - 0.08, 0.42, 0.65),
    clamp(primary.c, 0.10, 0.20),
    (primary.h + 322) % 360
  );

  return {
    brandPrimary,
    brandOnPrimary,
    brandHover,
    brandSubtle: `rgba(${pr}, ${pg}, ${pb}, ${subtleAlpha})`,
    brandGlow: `rgba(${pr}, ${pg}, ${pb}, ${glowAlpha})`,
    surfaceTint: `rgba(${pr}, ${pg}, ${pb}, ${tintAlpha})`,
    auraPrimary,
    auraSecondary,
    auraTertiary,
  };
}

function hashStringToHex(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return oklchToHex(0.65, 0.15, hue);
}

function pickDominantHex(data: Uint8ClampedArray): string | null {
  let bestScore = -1;
  let bestRgb: [number, number, number] | null = null;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sumR += r;
    sumG += g;
    sumB += b;
    count++;

    const { l, c } = rgbToOklch(r, g, b);
    if (l < 0.12 || l > 0.92) continue;
    const score = c * (1 - Math.abs(l - 0.55));
    if (score > bestScore) {
      bestScore = score;
      bestRgb = [r, g, b];
    }
  }

  if (bestRgb) return rgbToHex(bestRgb[0], bestRgb[1], bestRgb[2]);
  if (count > 0) return rgbToHex(sumR / count, sumG / count, sumB / count);
  return null;
}

function setCachedPalette(key: string, palette: DynamicPalette): void {
  if (paletteCache.has(key)) {
    paletteCache.delete(key);
  } else if (paletteCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = paletteCache.keys().next().value;
    if (oldestKey !== undefined) paletteCache.delete(oldestKey);
  }
  paletteCache.set(key, palette);
}

export async function extractDynamicPalette(
  imageUrl: string,
  resolvedTheme: ResolvedTheme
): Promise<DynamicPalette> {
  const cacheKey = `${resolvedTheme}:${imageUrl}`;
  const cached = paletteCache.get(cacheKey);
  if (cached) {
    setCachedPalette(cacheKey, cached);
    return cached;
  }

  const fallback = () => {
    const palette = computeDynamicPaletteFromHex(hashStringToHex(imageUrl), resolvedTheme);
    setCachedPalette(cacheKey, palette);
    return palette;
  };

  if (typeof document === "undefined" || typeof Image === "undefined" || !imageUrl) {
    return fallback();
  }

  return new Promise<DynamicPalette>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(fallback());
          return;
        }
        ctx.drawImage(img, 0, 0, 16, 16);
        const imageData = ctx.getImageData(0, 0, 16, 16);
        const dominantHex = pickDominantHex(imageData.data);
        const palette = dominantHex
          ? computeDynamicPaletteFromHex(dominantHex, resolvedTheme)
          : computeDynamicPaletteFromHex(hashStringToHex(imageUrl), resolvedTheme);
        setCachedPalette(cacheKey, palette);
        resolve(palette);
      } catch {
        // CORS taint or canvas read failure — deterministic hash-based fallback
        resolve(fallback());
      }
    };

    img.onerror = () => resolve(fallback());
    img.src = imageUrl;
  });
}
