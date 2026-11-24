"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { MotionConfig } from "framer-motion";
import { extractDynamicPalette, type DynamicPalette } from "./dynamicColor";

export type Theme = "dark" | "oled" | "light" | "system";
export type ResolvedTheme = "dark" | "oled" | "light";

export interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  dynamicAccentEnabled: boolean;
  setDynamicAccentEnabled: (enabled: boolean) => void;
  setDynamicSeedUrl: (url: string | null) => void;
  reduceTransparency: boolean;
  setReduceTransparency: (reduce: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const DYNAMIC_CSS_VARS = [
  "--brand-primary",
  "--brand-on-primary",
  "--brand-hover",
  "--brand-subtle",
  "--brand-glow",
  "--surface-tint",
  "--dying-aura-primary",
  "--dying-aura-secondary",
  "--dying-aura-tertiary",
] as const;

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    if (val === "true") return true;
    if (val === "false") return false;
  } catch {
    // Storage access blocked or unavailable
  }
  return fallback;
}

function applyDynamicPaletteVars(root: HTMLElement, palette: DynamicPalette): void {
  root.style.setProperty("--brand-primary", palette.brandPrimary);
  root.style.setProperty("--brand-on-primary", palette.brandOnPrimary);
  root.style.setProperty("--brand-hover", palette.brandHover);
  root.style.setProperty("--brand-subtle", palette.brandSubtle);
  root.style.setProperty("--brand-glow", palette.brandGlow);
  root.style.setProperty("--surface-tint", palette.surfaceTint);
  root.style.setProperty("--dying-aura-primary", palette.auraPrimary);
  root.style.setProperty("--dying-aura-secondary", palette.auraSecondary);
  root.style.setProperty("--dying-aura-tertiary", palette.auraTertiary);
}

function clearDynamicPaletteVars(root: HTMLElement): void {
  for (const cssVar of DYNAMIC_CSS_VARS) {
    root.style.removeProperty(cssVar);
  }
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = "dark",
  storageKey = "dying-theme",
  enableSystem = true,
}) => {
  const dynamicAccentKey = `${storageKey}-dynamic-accent`;
  const reduceTransparencyKey = `${storageKey}-reduce-transparency`;

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && ["dark", "oled", "light", "system"].includes(stored)) {
        return stored as Theme;
      }
    } catch {
      // Storage access blocked or unavailable
    }
    return defaultTheme;
  });

  const [dynamicAccentEnabled, setDynamicAccentState] = useState<boolean>(() =>
    readStoredBoolean(dynamicAccentKey, true)
  );
  const [reduceTransparency, setReduceTransparencyState] = useState<boolean>(() =>
    readStoredBoolean(reduceTransparencyKey, false)
  );
  const [dynamicSeedUrl, setDynamicSeedUrl] = useState<string | null>(null);

  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }, []);

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === "system") {
      return getSystemTheme();
    }
    return theme;
  });

  // Synchronize resolvedTheme and DOM data-theme attribute
  useEffect(() => {
    const root = document.documentElement;

    const computeResolved = (currentTheme: Theme): ResolvedTheme => {
      if (currentTheme === "system") {
        return getSystemTheme();
      }
      return currentTheme;
    };

    const newResolved = computeResolved(theme);
    setResolvedTheme(newResolved);
    root.setAttribute("data-theme", newResolved);

    if (newResolved === "light") {
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
    }

    if (theme === "system" && enableSystem) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
      const handleChange = () => {
        const updated = getSystemTheme();
        setResolvedTheme(updated);
        root.setAttribute("data-theme", updated);
        if (updated === "light") {
          root.classList.remove("dark");
        } else {
          root.classList.add("dark");
        }
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, enableSystem, getSystemTheme]);

  // Synchronize data-reduce-transparency attribute
  useEffect(() => {
    const root = document.documentElement;
    if (reduceTransparency) {
      root.setAttribute("data-reduce-transparency", "true");
    } else {
      root.removeAttribute("data-reduce-transparency");
    }
  }, [reduceTransparency]);

  // Synchronize dynamic accent CSS variables from artwork seed URL
  useEffect(() => {
    const root = document.documentElement;
    if (!dynamicAccentEnabled || !dynamicSeedUrl) {
      clearDynamicPaletteVars(root);
      return;
    }

    let cancelled = false;
    extractDynamicPalette(dynamicSeedUrl, resolvedTheme).then((palette) => {
      if (!cancelled) {
        applyDynamicPaletteVars(root, palette);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [dynamicAccentEnabled, dynamicSeedUrl, resolvedTheme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, newTheme);
      } catch {
        // Storage access blocked
      }
      setThemeState(newTheme);
    },
    [storageKey]
  );

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme =
      resolvedTheme === "dark" ? "oled" : resolvedTheme === "oled" ? "light" : "dark";
    setTheme(nextTheme);
  }, [resolvedTheme, setTheme]);

  const setDynamicAccentEnabled = useCallback(
    (enabled: boolean) => {
      try {
        localStorage.setItem(dynamicAccentKey, String(enabled));
      } catch {
        // Storage access blocked
      }
      setDynamicAccentState(enabled);
    },
    [dynamicAccentKey]
  );

  const setReduceTransparency = useCallback(
    (reduce: boolean) => {
      try {
        localStorage.setItem(reduceTransparencyKey, String(reduce));
      } catch {
        // Storage access blocked
      }
      setReduceTransparencyState(reduce);
    },
    [reduceTransparencyKey]
  );

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      dynamicAccentEnabled,
      setDynamicAccentEnabled,
      setDynamicSeedUrl,
      reduceTransparency,
      setReduceTransparency,
    }),
    [
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      dynamicAccentEnabled,
      setDynamicAccentEnabled,
      reduceTransparency,
      setReduceTransparency,
    ]
  );

  return (
    <MotionConfig reducedMotion="user">
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </MotionConfig>
  );
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "dark",
      resolvedTheme: "dark",
      setTheme: () => {},
      toggleTheme: () => {},
      dynamicAccentEnabled: true,
      setDynamicAccentEnabled: () => {},
      setDynamicSeedUrl: () => {},
      reduceTransparency: false,
      setReduceTransparency: () => {},
    };
  }
  return context;
}
