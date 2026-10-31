/**
 * ============================================================================
 * File:        src/analysis/riskEngine.ts
 * Purpose:     The Risk Analysis Engine. For each landmark it runs every
 *              hazard probe, then scores and classifies the result.
 *              Also exposes an end-to-end "analyze a state" workflow.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial engine (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — the full spatial-analysis pipeline:
 *
 *   landmarks (points)                     hazard layers (services)
 *        │                                        │
 *        ├── NRI tract lookup ───────────────────►│ coastal rating, resilience
 *        ├── FEMA polygon intersection ──────────►│ flood zone
 *        ├── WHP raster identify ────────────────►│ wildfire class
 *        └── NOAA raster identify (coastal only) ►│ +1 ft / +2 ft inundation
 *        │
 *        ▼
 *   severities (0–3) ──► weighted score (0–100) ──► Low / Moderate / High / Critical
 *
 * Each arrow is one HTTP request; the engine runs many landmarks in parallel
 * with a concurrency limit and reports progress so the UI can show a bar.
 */
import { ANALYSIS_CONCURRENCY } from "../config/appConfig";
import { getState } from "../config/states";
import type { AnalysisProgress, RiskAssessment } from "../types/analysis";
import type { HazardExposure } from "../types/hazard";
import type { Landmark } from "../types/landmark";
import { runPool } from "./arcgisRest";
import { probeFlood, probeNri, probeSeaLevel, probeWildfire, seaLevelNotApplicable } from "./hazardProbes";
import { loadLandmarksForState, type LandmarkScope } from "./landmarkSource";
import { buildAssessment } from "./riskScoring";

/** Options shared by the engine's entry points. */
export interface EngineOptions {
  signal?: AbortSignal;
  onProgress?: (p: AnalysisProgress) => void;
  /** Max concurrent landmarks (each landmark issues up to 4 requests). */
  concurrency?: number;
}

/**
 * Analyzes one landmark against every hazard layer.
 *
 * LEARNING NOTE:
 * The NRI, flood and wildfire probes are independent, so they run at the same
 * time (Promise.all). The sea-level probe runs afterwards because it is only
 * worth doing when the landmark is in a coastal community — we use the NRI
 * answer (or the FEMA "V" coastal zone) to decide. This "gating" skips
 * thousands of pointless requests for inland places like Mesa Verde.
 *
 * @param landmark Feature representing a historic site.
 * @param signal Optional AbortSignal.
 * @returns Risk assessment object.
 */
export async function assessLandmark(landmark: Landmark, signal?: AbortSignal): Promise<RiskAssessment> {
  const [nri, flood, wildfire] = await Promise.all([
    probeNri(landmark, signal),
    probeFlood(landmark, signal),
    probeWildfire(landmark, signal),
  ]);

  // Decide whether the sea can plausibly reach this landmark.
  const coastalState = getState(landmark.state)?.coastal ?? true;
  const coastalZone = flood.label.startsWith("Zone V");
  const shouldTestSlr = coastalZone || nri.coastalTract === true || (nri.coastalTract === null && coastalState);

  const slr: HazardExposure = shouldTestSlr
    ? await probeSeaLevel(landmark, signal)
    : seaLevelNotApplicable(
        coastalState
          ? "The surrounding census tract has no coastal-flood exposure in the FEMA National Risk Index, so the NOAA test was skipped."
          : `${getState(landmark.state)?.name ?? landmark.state} has no tidal shoreline, so the NOAA test was skipped.`,
      );

  // Supplemental NRI ratings are added to the explanation, not to the score.
  const coastal: HazardExposure = { ...nri.exposure };
  const extras: string[] = [];
  if (nri.context.wildfireRating) extras.push(`NRI wildfire risk: ${nri.context.wildfireRating}`);
  if (nri.context.riverineRating) extras.push(`NRI riverine flood risk: ${nri.context.riverineRating}`);
  if (extras.length) coastal.detail = `${coastal.detail} (${extras.join("; ")}.)`;

  return buildAssessment(landmark, [flood, slr, wildfire, coastal], nri.resilience);
}

/**
 * Analyzes many landmarks with a concurrency limit and progress reporting.
 *
 * @param landmarks Landmarks to analyze.
 * @param options Signal, progress callback and concurrency.
 * @returns Assessments in the same order as the input.
 */
export async function assessLandmarks(landmarks: Landmark[], options: EngineOptions = {}): Promise<RiskAssessment[]> {
  const limit = options.concurrency ?? Math.max(1, Math.floor(ANALYSIS_CONCURRENCY / 2));
  options.onProgress?.({ phase: "hazards", completed: 0, total: landmarks.length, message: "Testing hazard layers…" });
  return runPool(
    landmarks,
    limit,
    (l) => assessLandmark(l, options.signal),
    options.signal,
    (done, total) =>
      options.onProgress?.({
        phase: done === total ? "done" : "hazards",
        completed: done,
        total,
        message: done === total ? "Analysis complete" : `Tested ${done} of ${total} landmarks`,
      }),
  );
}

/**
 * End-to-end live analysis for one state: load landmarks, then assess them.
 *
 * @param stateAbbr Two-letter state code.
 * @param scope "nhl" or "all".
 * @param maxLandmarks Safety cap so a big state does not run for an hour in the browser.
 * @param options Signal, progress callback and concurrency.
 * @returns Assessments sorted by descending score, plus how many were skipped by the cap.
 */
export async function analyzeState(
  stateAbbr: string,
  scope: LandmarkScope,
  maxLandmarks: number,
  options: EngineOptions = {},
): Promise<{ assessments: RiskAssessment[]; found: number; skipped: number }> {
  options.onProgress?.({ phase: "landmarks", completed: 0, total: 0, message: "Loading historic places…" });
  const landmarks = await loadLandmarksForState(stateAbbr, scope, options.signal, (n) =>
    options.onProgress?.({ phase: "landmarks", completed: n, total: 0, message: `Loaded ${n} historic places…` }),
  );
  // National Historic Landmarks first, then alphabetical, so the cap keeps the most significant places.
  const ordered = [...landmarks].sort((a, b) => Number(b.isNHL) - Number(a.isNHL) || a.name.localeCompare(b.name));
  const selected = ordered.slice(0, maxLandmarks);
  const assessments = await assessLandmarks(selected, options);
  assessments.sort((a, b) => b.score - a.score);
  return { assessments, found: landmarks.length, skipped: landmarks.length - selected.length };
}
