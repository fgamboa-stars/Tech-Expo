/**
 * ============================================================================
 * File:        src/analysis/riskScoring.ts
 * Purpose:     Turns raw hazard-layer answers into 0–3 severities, combines
 *              them into a 0–100 risk score, and assigns Low / Moderate /
 *              High / Critical classes. Pure functions, fully unit-tested.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial scoring model (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — the scoring model in one paragraph:
 * Each hazard gets a severity from 0 (none) to 3 (severe). Severities are
 * weighted (sea-level rise counts a little more because it is permanent;
 * community coastal-flood risk a little less because it describes the
 * neighborhood, not the exact building) and scaled to 0–100. Landmarks hit
 * by several elevated hazards get a bonus, because compound threats are
 * harder to adapt to, and communities FEMA rates as having low resilience
 * get a small multiplier. Finally, classes use BOTH the score and the worst
 * single hazard, so one severe threat is never averaged away.
 */
import type { HazardExposure, HazardId, ResilienceContext, Severity } from "../types/hazard";
import { HAZARD_IDS } from "../types/hazard";
import type { RiskAssessment, RiskClass } from "../types/analysis";
import type { Landmark } from "../types/landmark";

/** Relative importance of each hazard in the composite score. */
export const HAZARD_WEIGHTS: Record<HazardId, number> = {
  flood: 1.0,
  slr: 1.2,
  wildfire: 1.0,
  coastal: 0.8,
};

/** Points added for each additional hazard at severity ≥ 2 beyond the first. */
export const MULTI_HAZARD_BONUS = 8;

/** Score thresholds for each class (see classifyRisk for the full rule). */
export const CLASS_THRESHOLDS = { critical: 55, high: 35, moderate: 15 } as const;

/** Human-readable severity names. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  0: "None detected",
  1: "Low",
  2: "Elevated",
  3: "Severe",
};

/* ------------------------------------------------------------------------ */
/* 1. Severity mappings — one per data source                               */
/* ------------------------------------------------------------------------ */

/** Result of a severity mapping: the number plus a readable label. */
export interface SeverityResult {
  severity: Severity;
  label: string;
}

/**
 * Converts a FEMA flood zone into a severity.
 *
 * LEARNING NOTE — reading FEMA zone codes:
 *  - V / VE: coastal high-hazard area — storm waves 3 ft or higher. Severe.
 *  - A, AE, AH, AO, AR, A99: the "Special Flood Hazard Area", a 1% chance of
 *    flooding every year (26% over a 30-year mortgage). Elevated.
 *  - X (shaded) / "0.2 PCT ANNUAL CHANCE": the 500-year floodplain. Low.
 *  - X (unshaded) / D / no polygon: minimal or undetermined. None.
 *
 * @param zone FLD_ZONE value, e.g. "AE".
 * @param subtype ZONE_SUBTY value, e.g. "0.2 PCT ANNUAL CHANCE FLOOD HAZARD".
 * @param sfha SFHA_TF value ("T" when inside the Special Flood Hazard Area).
 * @returns Severity and label.
 */
export function floodZoneSeverity(zone?: string | null, subtype?: string | null, sfha?: string | null): SeverityResult {
  const z = (zone ?? "").trim().toUpperCase();
  const sub = (subtype ?? "").toUpperCase();
  if (z.startsWith("V")) return { severity: 3, label: `Zone ${z} — coastal high-hazard area (wave action)` };
  if (sfha === "T" || /^A(E|H|O|R|99)?$/.test(z)) {
    return { severity: 2, label: `Zone ${z || "A"} — 1% annual-chance (100-year) floodplain` };
  }
  if (sub.includes("0.2") || sub.includes("500")) return { severity: 1, label: "0.2% annual-chance (500-year) floodplain" };
  if (sub.includes("LEVEE")) return { severity: 1, label: "Behind a levee — reduced but not zero flood risk" };
  if (z === "D") return { severity: 0, label: "Zone D — flood risk undetermined" };
  return { severity: 0, label: z ? `Zone ${z} — minimal flood hazard` : "No mapped flood hazard" };
}

/**
 * Converts the sea-level-rise test into a severity.
 * @param wetAt1ft Inundated in NOAA's +1 ft scenario (≈ 2050 average projection).
 * @param wetAt2ft Inundated in NOAA's +2 ft scenario (≈ higher-end 2050 / Gulf Coast).
 * @returns Severity and label.
 */
export function seaLevelSeverity(wetAt1ft: boolean, wetAt2ft: boolean): SeverityResult {
  if (wetAt1ft) return { severity: 3, label: "Underwater at high tide with +1 ft of sea-level rise (likely by 2050)" };
  if (wetAt2ft) return { severity: 2, label: "Underwater at high tide with +2 ft of sea-level rise (possible by 2050)" };
  return { severity: 0, label: "Above projected +2 ft high-tide line" };
}

/** Wildfire Hazard Potential class names (USDA Forest Service classified product). */
export const WHP_CLASS_NAMES: Record<number, string> = {
  1: "Very low",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Very high",
  6: "Non-burnable",
  7: "Water",
};

/**
 * Converts a Wildfire Hazard Potential class (1–7) into a severity.
 * @param whpClass Pixel value from the WHP image service, or null for NoData.
 * @returns Severity and label.
 */
export function wildfireSeverity(whpClass: number | null): SeverityResult {
  if (whpClass === null) return { severity: 0, label: "Outside wildfire hazard mapping" };
  const name = WHP_CLASS_NAMES[whpClass] ?? `Class ${whpClass}`;
  const severity: Severity = whpClass === 5 ? 3 : whpClass === 4 ? 2 : whpClass === 3 ? 1 : 0;
  return { severity, label: `${name} wildfire hazard potential` };
}

/**
 * Converts a FEMA National Risk Index rating string into a severity.
 * NRI ratings: Very High, Relatively High, Relatively Moderate, Relatively Low,
 * Very Low, No Rating, Not Applicable, Insufficient Data.
 * @param rating e.g. "Relatively High".
 * @returns Severity and label.
 */
export function nriRatingSeverity(rating?: string | null): SeverityResult {
  const r = (rating ?? "").trim();
  const lower = r.toLowerCase();
  if (lower === "very high") return { severity: 3, label: "Very high community coastal-flood risk" };
  if (lower === "relatively high") return { severity: 2, label: "Relatively high community coastal-flood risk" };
  if (lower === "relatively moderate") return { severity: 1, label: "Moderate community coastal-flood risk" };
  if (lower === "relatively low" || lower === "very low") return { severity: 0, label: `${r} community coastal-flood risk` };
  return { severity: 0, label: "Not a coastal-flood community" };
}

/**
 * True when an NRI coastal rating means the tract has coastal exposure at
 * all — used to decide whether the (slower) sea-level-rise test is needed.
 */
export function nriIndicatesCoastal(rating?: string | null): boolean {
  const lower = (rating ?? "").trim().toLowerCase();
  return lower !== "" && !["not applicable", "no rating", "insufficient data"].includes(lower);
}

/**
 * Converts an NRI Community Resilience rating into a score multiplier.
 *
 * LEARNING NOTE:
 * Two identical buildings face different futures if one community has the
 * money, plans and institutions to recover and the other does not. FEMA's
 * resilience rating captures that. We only ever INCREASE risk for low
 * resilience; we never let high resilience hide a physical hazard.
 *
 * @param rating NRI RESL_RATNG value.
 * @returns Resilience context, or undefined when not rated.
 */
export function resilienceFromRating(rating?: string | null): ResilienceContext | undefined {
  const r = (rating ?? "").trim();
  const lower = r.toLowerCase();
  if (lower === "very low") return { rating: r, factor: 1.1 };
  if (lower === "relatively low") return { rating: r, factor: 1.05 };
  if (["relatively moderate", "relatively high", "very high"].includes(lower)) return { rating: r, factor: 1 };
  return undefined;
}

/* ------------------------------------------------------------------------ */
/* 2. Composite score and classification                                     */
/* ------------------------------------------------------------------------ */

/**
 * Computes the 0–100 composite risk score.
 *
 * score = 100 × Σ(weight × severity) / Σ(weight × 3)        (weighted average)
 *       × resilience factor                                  (1.00–1.10)
 *       + 8 × (number of hazards at severity ≥ 2 − 1)        (compound bonus)
 * capped at 100. Unassessed hazards (null) count as 0.
 *
 * @param exposures One exposure per hazard.
 * @param resilience Optional NRI resilience context.
 * @returns Score rounded to one decimal.
 */
export function computeRiskScore(exposures: HazardExposure[], resilience?: ResilienceContext): number {
  let weighted = 0;
  let maxWeighted = 0;
  for (const e of exposures) {
    const w = HAZARD_WEIGHTS[e.hazard];
    weighted += w * (e.severity ?? 0);
    maxWeighted += w * 3;
  }
  if (maxWeighted === 0) return 0;
  const significant = exposures.filter((e) => (e.severity ?? 0) >= 2).length;
  const base = (100 * weighted) / maxWeighted;
  const adjusted = base * (resilience?.factor ?? 1) + MULTI_HAZARD_BONUS * Math.max(0, significant - 1);
  return Math.round(Math.min(100, adjusted) * 10) / 10;
}

/**
 * Assigns a risk class from the score AND the worst single hazard.
 *
 *  - Critical: score ≥ 55, or a severe hazard plus at least one other elevated one
 *  - High:     score ≥ 35, or any single severe (3) hazard
 *  - Moderate: score ≥ 15, or any elevated (2) hazard
 *  - Low:      everything else
 *
 * @param score Composite score from computeRiskScore.
 * @param exposures One exposure per hazard.
 * @returns The risk class.
 */
export function classifyRisk(score: number, exposures: HazardExposure[]): RiskClass {
  const severities = exposures.map((e) => e.severity ?? 0);
  const max = Math.max(0, ...severities);
  const significant = severities.filter((s) => s >= 2).length;
  if (score >= CLASS_THRESHOLDS.critical || (max === 3 && significant >= 2)) return "Critical";
  if (score >= CLASS_THRESHOLDS.high || max === 3) return "High";
  if (score >= CLASS_THRESHOLDS.moderate || max >= 2) return "Moderate";
  return "Low";
}

/**
 * Builds the plain-language "why is this landmark threatened?" list.
 * @param exposures One exposure per hazard.
 * @param resilience Optional resilience context.
 * @returns Sentences, most severe first.
 */
export function explainExposures(exposures: HazardExposure[], resilience?: ResilienceContext): string[] {
  const reasons = exposures
    .filter((e) => (e.severity ?? 0) >= 1)
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0))
    .map((e) => `${SEVERITY_LABELS[e.severity as Severity]}: ${e.label}.`);
  const significant = exposures.filter((e) => (e.severity ?? 0) >= 2).length;
  if (significant >= 2) reasons.push(`Compound threat: ${significant} hazards at elevated or severe levels.`);
  if (resilience && resilience.factor > 1) {
    reasons.push(`The surrounding community has ${resilience.rating.toLowerCase()} resilience (FEMA National Risk Index), which slows recovery.`);
  }
  if (reasons.length === 0) reasons.push("No elevated hazard detected at this location in the layers analyzed.");
  return reasons;
}

/**
 * Builds a full RiskAssessment from a landmark and its hazard exposures.
 *
 * @param landmark The historic place.
 * @param exposures Exposures (any order; missing hazards are filled as "not assessed").
 * @param resilience Optional resilience context.
 * @returns The finished assessment.
 */
export function buildAssessment(
  landmark: Landmark,
  exposures: HazardExposure[],
  resilience?: ResilienceContext,
): RiskAssessment {
  // Normalize to exactly one exposure per hazard, in a fixed order.
  const ordered: HazardExposure[] = HAZARD_IDS.map(
    (id) =>
      exposures.find((e) => e.hazard === id) ?? {
        hazard: id,
        severity: null,
        label: "Not assessed",
        detail: "This hazard has not been assessed for this landmark yet.",
        method: "gis",
        source: "—",
      },
  );
  const score = computeRiskScore(ordered, resilience);
  const riskClass = classifyRisk(score, ordered);
  const significantHazards = ordered.filter((e) => (e.severity ?? 0) >= 2).map((e) => e.hazard);
  return {
    landmark,
    exposures: ordered,
    resilience,
    score,
    riskClass,
    threatened: riskClass !== "Low",
    significantHazards,
    multiHazard: significantHazards.length >= 2,
    incomplete: ordered.some((e) => e.severity === null),
    reasons: explainExposures(ordered, resilience),
    analyzedAt: new Date().toISOString(),
  };
}
