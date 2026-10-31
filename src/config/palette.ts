/**
 * ============================================================================
 * File:        src/config/palette.ts
 * Purpose:     Color values needed in JavaScript (the ArcGIS map renderers
 *              cannot read CSS variables). Mirrors styles/global.css.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial palette (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — color has jobs:
 *  - Risk classes are ORDERED (Low → Critical), so they use one warm ramp
 *    from muted slate to deep red. Darker/warmer always means worse.
 *  - Hazards are CATEGORIES (flood, sea level, fire, coastal), so they use
 *    distinct hues in a fixed order that was checked for color-blind
 *    separation. A hazard keeps the same color on every chart.
 *  - Color never works alone: every badge and chart also prints a label.
 */
import type { Theme } from "../context/ThemeContext";
import type { RiskClass } from "../types/analysis";
import type { HazardId } from "../types/hazard";

export const RISK_COLORS: Record<Theme, Record<RiskClass, string>> = {
  light: { Low: "#8a9ba3", Moderate: "#d79a1e", High: "#d4622a", Critical: "#b3261e" },
  dark: { Low: "#7d8e96", Moderate: "#e0a83a", High: "#e8743a", Critical: "#e5534b" },
};

export const HAZARD_COLORS: Record<Theme, Record<HazardId, string>> = {
  light: { flood: "#2a78d6", wildfire: "#eb6834", slr: "#1baf7a", coastal: "#eda100" },
  dark: { flood: "#3987e5", wildfire: "#d95926", slr: "#199e70", coastal: "#c98500" },
};

/** Map point outline (the "surface ring" that separates overlapping points). */
export const MAP_SURFACE: Record<Theme, string> = { light: "#ffffff", dark: "#0f1a20" };

/** Outline of the selected state on the map. */
export const SELECTION_COLOR: Record<Theme, string> = { light: "#14212b", dark: "#e6ecea" };
