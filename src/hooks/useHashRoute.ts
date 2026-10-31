/**
 * ============================================================================
 * File:        src/hooks/useHashRoute.ts
 * Purpose:     Minimal hash-based router: reads `#/path/param` from the URL,
 *              re-renders on change, and offers a navigate() helper.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Hash routes (example.com/#/map) never reach the web server — the part
 * after # stays in the browser. That means the built app works on any static
 * host (GitHub Pages, a USB stick at an expo) with no server configuration.
 * A full router library is unnecessary for six pages.
 */
import { useCallback, useEffect, useState } from "react";

/** The parsed route. */
export interface Route {
  /** First path segment, e.g. "explore" for #/explore/FL ("" for home). */
  page: string;
  /** Remaining segments, e.g. ["FL"]. */
  params: string[];
}

/** Parses window.location.hash into a Route. */
export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, "").split("?")[0];
  const [page = "", ...params] = clean.split("/").filter(Boolean).map(decodeURIComponent);
  return { page, params };
}

/**
 * Subscribes to hash changes.
 * @returns The current route and a navigate function.
 */
export function useHashRoute(): { route: Route; navigate: (to: string) => void } {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      // Move focus to the main region so keyboard and screen-reader users land on the new page.
      document.getElementById("main")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to.startsWith("#") ? to : `#${to}`;
  }, []);

  return { route, navigate };
}
