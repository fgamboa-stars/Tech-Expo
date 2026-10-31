/**
 * ============================================================================
 * File:        src/types/hazard.ts
 * Purpose:     Type definitions for climate hazards and a landmark's exposure
 *              to each one.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial types (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/**
 * The four hazards the Risk Analysis Engine measures.
 *  - flood:    FEMA flood zones (river, rain and storm-surge flooding today)
 *  - slr:      NOAA projected sea-level-rise inundation (the "underwater by 2050" question)
 *  - wildfire: USDA Forest Service Wildfire Hazard Potential (the "burned by 2050" question)
 *  - coastal:  FEMA National Risk Index coastal-flooding risk for the surrounding community
 */
export type HazardId = "flood" | "slr" | "wildfire" | "coastal";

export const HAZARD_IDS: HazardId[] = ["flood", "slr", "wildfire", "coastal"];

/**
 * Severity on a 0–3 scale shared by every hazard so they can be compared:
 *   0 = none detected, 1 = low, 2 = elevated, 3 = severe.
 * `null` means "not assessed" (the service could not be reached, or the
 * reference dataset has no evidence either way).
 */
export type Severity = 0 | 1 | 2 | 3;

/** How an exposure value was obtained. */
export type EvidenceMethod =
  /** Computed by intersecting the landmark's location with a GIS hazard layer. */
  | "gis"
  /** Taken from a published assessment or a documented past event. */
  | "documented";

/** One landmark's exposure to one hazard. */
export interface HazardExposure {
  hazard: HazardId;
  /** 0–3, or null when not assessed. */
  severity: Severity | null;
  /** Short human-readable result, e.g. "Zone AE (100-year floodplain)". */
  label: string;
  /** Longer explanation of why this severity was assigned. */
  detail: string;
  method: EvidenceMethod;
  /** Where the evidence came from (agency/report name). */
  source: string;
  /** Optional link to the evidence. */
  sourceUrl?: string;
}

/** Community resilience context from the FEMA National Risk Index. */
export interface ResilienceContext {
  /** NRI rating text, e.g. "Very Low". */
  rating: string;
  /** Multiplier applied to the risk score (≥ 1 means less resilient). */
  factor: number;
}
