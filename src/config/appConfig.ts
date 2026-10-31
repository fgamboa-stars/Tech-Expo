/**
 * ============================================================================
 * File:        src/config/appConfig.ts
 * Purpose:     Central place to read environment variables and app-wide
 *              constants. Works in both the browser (Vite) and Node (the
 *              `npm run analyze` script).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/**
 * Reads an environment variable from whichever runtime we are in.
 *
 * LEARNING NOTE:
 * Vite replaces `import.meta.env.VITE_*` at build time for the browser.
 * Node (used by scripts/run-analysis.ts) has no `import.meta.env`, so we
 * fall back to `process.env`. Writing config this way lets the exact same
 * analysis code run in the browser AND on the command line.
 *
 * @param name Variable name, e.g. "VITE_ARCGIS_API_KEY".
 * @returns The trimmed value, or undefined when unset/empty.
 */
export function readEnv(name: string): string | undefined {
  let value: string | undefined;
  try {
    const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    value = viteEnv?.[name];
  } catch {
    value = undefined;
  }
  if (value === undefined) {
    const nodeProcess = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
    value = nodeProcess?.env?.[name];
  }
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Version of the ArcGIS Maps SDK used for the CDN widget theme CSS. Keep in sync with package.json. */
export const ARCGIS_SDK_VERSION = "4.34";

/** Optional ArcGIS API key (basemaps work without one for demos). */
export const ARCGIS_API_KEY = readEnv("VITE_ARCGIS_API_KEY");

/** How many REST requests the live analysis may run at once. */
export const ANALYSIS_CONCURRENCY = Math.max(1, Math.min(12, Number(readEnv("VITE_ANALYSIS_CONCURRENCY") ?? 6) || 6));

/** The planning horizon used throughout the app's copy and scenario choices. */
export const PLANNING_YEAR = 2050;

/** Path (relative to the site root) of the optional pre-computed national analysis. */
export const NATIONAL_RESULTS_PATH = "data/analysis-results.json";
