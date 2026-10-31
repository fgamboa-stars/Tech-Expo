/**
 * ============================================================================
 * File:        src/context/ThemeContext.tsx
 * Purpose:     Light / dark mode. Stores the choice, applies it to <html>,
 *              and swaps the ArcGIS widget stylesheet to match.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * All colors in styles/global.css are CSS custom properties defined twice:
 * once under [data-theme="light"] and once under [data-theme="dark"].
 * Switching themes is therefore a single attribute change on <html>; no
 * component needs to know which theme is active. The map is the exception:
 * ArcGIS ships separate light and dark widget stylesheets and basemaps, so
 * HeritageMap reads `theme` from this context.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ARCGIS_SDK_VERSION } from "../config/appConfig";

export type Theme = "light" | "dark";

interface ThemeValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const STORAGE_KEY = "har-theme";

/** Reads the theme already applied by the inline script in index.html. */
function initialTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/**
 * Provides the current theme to the component tree.
 * @param props.children The app.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const link = document.getElementById("esri-theme") as HTMLLinkElement | null;
    if (link) link.href = `https://js.arcgis.com/${ARCGIS_SDK_VERSION}/esri/themes/${theme}/main.css`;
    const meta = document.querySelectorAll('meta[name="theme-color"]');
    meta.forEach((m) => m.setAttribute("content", theme === "dark" ? "#0f1a20" : "#eef1ee"));
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage can be unavailable (private mode); the theme still applies for this visit */
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState((t) => (t === "dark" ? "light" : "dark")), []);
  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook to read and change the theme. */
export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
