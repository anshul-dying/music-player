/**
 * Dying Design System — Monochrome Graphite Tokens
 * W3C DTCG-compliant token specification & TypeScript definitions
 */

import tokensJson from "./tokens.json" with { type: "json" };

export const dyingTokens = tokensJson;

export const primitiveTokens = {
  colors: {
    // 10-Step Monochrome Graphite Scale
    graphite50: "#f7f7f8",
    graphite100: "#e5e5ea",
    graphite200: "#d1d1d6",
    graphite300: "#aeaeb2",
    graphite400: "#86868b",
    graphite500: "#636366",
    graphite600: "#48484a",
    graphite700: "#2c2c2e",
    graphite800: "#1e1e22",
    graphite850: "#18181b",
    graphite900: "#141416",
    graphite950: "#121214",

    // Base Solids
    white: "#ffffff",
    black: "#000000",

    // Semantic Canvas & Surface Mappings
    canvas: "#141416",
    sidebar: "#121214",
    surface: "#1e1e22",
    surfaceHover: "#28282c",
    surfaceActive: "#2c2c2e",
    border: "rgba(255, 255, 255, 0.08)",
    borderMuted: "rgba(255, 255, 255, 0.12)",
    borderFocus: "rgba(255, 255, 255, 0.40)",
    borderSpecular: "rgba(255, 255, 255, 0.16)",

    // Typography
    textPrimary: "#ffffff",
    textSecondary: "#98989d",
    textTertiary: "#86868b",
    textKicker: "#86868b",

    // Glass & Acrylic
    glassFrosted: "rgba(30, 30, 34, 0.85)",
    glassElevated: "rgba(30, 30, 34, 0.92)",
    glassThin: "rgba(255, 255, 255, 0.04)",
    glassBorder: "rgba(255, 255, 255, 0.08)",

    // Semantic Status Colors
    success: "#34d399",
    warning: "#fbbf24",
    error: "#f43f5e",
    info: "#38bdf8",

    // Brand Colors (GaneGan Vermillion/Coral Identity)
    brandCoral: "#FF6A4D",
    brandVermillion: "#D6452B",
    brandPrimary: "#FF6A4D",

    // Backward-compatibility aliases
    zinc950: "#121214",
    zinc900: "#1e1e22",
    zinc800: "#28282c",
    emerald500: "#ffffff",
    rose500: "#f43f5e",
  },
  spacing: {
    0: "0px",
    1: "4px",
    2: "8px",
    3: "12px",
    4: "16px",
    5: "20px",
    6: "24px",
    8: "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },
  radius: {
    none: "0px",
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    "3xl": "24px",
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.6), 0 4px 6px -4px rgba(0, 0, 0, 0.6)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.7)",
    "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
    specularInset: "inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
    specularGlow: "inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 12px 36px -4px rgba(0, 0, 0, 0.7)",
    pillDock: "inset 0 1px 0 0 rgba(255, 255, 255, 0.15), 0 20px 48px -8px rgba(0, 0, 0, 0.85)",
  },
  blurs: {
    none: "0px",
    sm: "4px",
    md: "8px",
    panel: "24px",
    card: "24px",
    pill: "24px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "60px",
    aura: "60px",
  },
  opacities: {
    glassBg: 0.85,
    glassHover: 0.95,
    glassBorder: 0.08,
    textPrimary: 1.0,
    textSecondary: 0.72,
    textMuted: 0.50,
    textDim: 0.35,
  },
  typography: {
    fontFamilies: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSizes: {
      xs: "12px",
      sm: "14px",
      base: "16px",
      lg: "18px",
      xl: "20px",
      "2xl": "24px",
      "3xl": "30px",
      "4xl": "36px",
      "5xl": "48px",
    },
    fontWeights: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeights: {
      tight: 1.15,
      snug: 1.35,
      normal: 1.5,
      relaxed: 1.625,
    },
  },
  zIndex: {
    hide: -1,
    base: 0,
    dock: 10,
    dropdown: 20,
    sticky: 30,
    banner: 40,
    modal: 50,
    popover: 60,
    toast: 70,
  },
  springs: {
    snappy: "cubic-bezier(0.19, 1, 0.22, 1)",
    bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
    tactile: "cubic-bezier(0.2, 0.8, 0.2, 1)",
  },
  breakpoints: {
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    "2xl": "1536px",
  },
} as const;

export const semanticTokens = {
  surfaces: {
    canvas: primitiveTokens.colors.canvas,
    sidebar: primitiveTokens.colors.sidebar,
    card: primitiveTokens.colors.surface,
    hover: primitiveTokens.colors.surfaceHover,
    activePill: primitiveTokens.colors.surfaceActive,
    border: primitiveTokens.colors.border,
    borderMuted: primitiveTokens.colors.borderMuted,
    borderFocus: primitiveTokens.colors.borderFocus,
    glass: primitiveTokens.colors.glassFrosted,
    glassHover: primitiveTokens.colors.surfaceHover,
    glassBorder: primitiveTokens.colors.border,
    glassElevated: primitiveTokens.colors.glassElevated,
    overlay: "rgba(0, 0, 0, 0.75)",
  },
  text: {
    primary: primitiveTokens.colors.white,
    secondary: primitiveTokens.colors.textSecondary,
    tertiary: primitiveTokens.colors.textTertiary,
    kicker: primitiveTokens.colors.textTertiary,
    muted: primitiveTokens.colors.textSecondary,
    inverse: primitiveTokens.colors.black,
    accent: primitiveTokens.colors.white,
  },
  actions: {
    primary: {
      bg: primitiveTokens.colors.white,
      text: primitiveTokens.colors.black,
      hover: primitiveTokens.colors.graphite100,
    },
    secondary: {
      bg: primitiveTokens.colors.surfaceActive,
      text: primitiveTokens.colors.white,
      hover: primitiveTokens.colors.surfaceHover,
    },
    glass: {
      bg: primitiveTokens.colors.glassFrosted,
      text: primitiveTokens.colors.white,
      hover: primitiveTokens.colors.surfaceHover,
      border: primitiveTokens.colors.border,
    },
    ghost: {
      text: primitiveTokens.colors.textSecondary,
      hover: primitiveTokens.colors.white,
      hoverBg: "rgba(255, 255, 255, 0.08)",
    },
  },
  feedback: {
    playing: primitiveTokens.colors.white,
    success: primitiveTokens.colors.success,
    warning: primitiveTokens.colors.warning,
    error: primitiveTokens.colors.error,
    info: primitiveTokens.colors.info,
  },
  brand: {
    primary: "#FF6A4D",
    primaryLight: "#D6452B",
    primaryDark: "#FF6A4D",
    subtle: "rgba(255, 106, 77, 0.15)",
    glow: "rgba(255, 106, 77, 0.25)",
  },
} as const;

export const componentTokens = {
  sidebar: {
    width: "240px",
    background: primitiveTokens.colors.sidebar,
  },
  playerPill: {
    maxWidth: "720px",
    background: primitiveTokens.colors.glassFrosted,
    blur: "24px",
    borderRadius: "16px",
  },
  playerBar: {
    height: "88px",
    background: primitiveTokens.colors.glassFrosted,
    blur: "24px",
  },
  scrubber: {
    trackHeight: "4px",
    thumbSize: "12px",
    hoverTrackHeight: "6px",
  },
  lyrics: {
    activeScale: 1.05,
    activeGlow: "0 0 24px rgba(255, 255, 255, 0.25)",
    inactiveOpacity: primitiveTokens.opacities.textDim,
  },
} as const;

export {
  ThemeProvider,
  useTheme,
  type Theme,
  type ResolvedTheme,
  type ThemeProviderProps,
  type ThemeContextValue,
} from "./ThemeProvider";

export {
  extractDynamicPalette,
  computeDynamicPaletteFromHex,
  getContrastRatio,
  type DynamicPalette,
} from "./dynamicColor";

export type PrimitiveTokens = typeof primitiveTokens;
export type SemanticTokens = typeof semanticTokens;
export type ComponentTokens = typeof componentTokens;
