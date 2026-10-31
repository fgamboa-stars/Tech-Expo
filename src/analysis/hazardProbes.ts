/**
 * ============================================================================
 * File:        src/analysis/hazardProbes.ts
 * Purpose:     One "probe" per hazard. A probe takes a landmark's location,
 *              asks the matching hazard service what is there, and returns a
 *              HazardExposure (severity + explanation).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial probes: FEMA flood, NOAA SLR, USFS WHP, FEMA NRI
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Each data source speaks a different "language": FEMA returns polygons
 * with zone codes, the Forest Service returns raster pixel classes, NOAA
 * returns inundation-depth pixels, and the Risk Index returns ratings per
 * census tract. Probes translate all of them into one shared vocabulary —
 * a 0–3 severity — so the risk engine can compare apples to apples.
 * To add a hazard, write one more probe (see DEVELOPER_GUIDE.md §10).
 */
import {
  FIELDS,
  NRI_TRACTS_URL,
  FEMA_FLOOD_URL,
  WHP_URL,
  SLR_LIKELY_FEET,
  SLR_POSSIBLE_FEET,
  slrServiceUrl,
  hazardConfig,
} from "../config/layers";
import type { HazardExposure, HazardId, ResilienceContext } from "../types/hazard";
import type { Landmark } from "../types/landmark";
import { identifyImageValue, identifyMapService, queryFeaturesAtPoint, ServiceError } from "./arcgisRest";
import {
  floodZoneSeverity,
  nriIndicatesCoastal,
  nriRatingSeverity,
  resilienceFromRating,
  seaLevelSeverity,
  wildfireSeverity,
} from "./riskScoring";

/**
 * Builds the exposure returned when a service could not answer.
 *
 * LEARNING NOTE:
 * "We could not check" is NOT the same as "no hazard". Recording null keeps
 * the difference visible, so a server outage never makes a landmark look safe.
 */
function unavailable(hazard: HazardId, err: unknown): HazardExposure {
  const cfg = hazardConfig(hazard);
  return {
    hazard,
    severity: null,
    label: "Service unavailable — not assessed",
    detail: err instanceof Error ? err.message : String(err),
    method: "gis",
    source: cfg.publisher,
  };
}

/** Re-throws cancellation so a user's "Stop" button actually stops the run. */
function rethrowIfAborted(err: unknown, signal?: AbortSignal): void {
  if (signal?.aborted) throw err;
  if (!(err instanceof ServiceError) && (err as Error)?.name === "AbortError") throw err;
}

/* ------------------------------------------------------------------------ */
/* FEMA National Risk Index (coastal flooding + community resilience)        */
/* ------------------------------------------------------------------------ */

/** What the NRI probe learns about a location. */
export interface NriProbeResult {
  exposure: HazardExposure;
  resilience?: ResilienceContext;
  /** True when the tract has any coastal-flood exposure (gates the SLR probe). */
  coastalTract: boolean | null;
  /** Supplemental NRI ratings, shown as context but not double-counted in the score. */
  context: { wildfireRating?: string; riverineRating?: string; tract?: string };
}

/**
 * Looks up the census tract under a landmark in the FEMA National Risk Index.
 *
 * @param landmark The landmark to probe.
 * @param signal Optional AbortSignal.
 * @returns Coastal-flood exposure, resilience context and gating information.
 */
export async function probeNri(landmark: Landmark, signal?: AbortSignal): Promise<NriProbeResult> {
  const f = FIELDS.nri;
  try {
    const rows = await queryFeaturesAtPoint<Record<string, string | null>>(
      NRI_TRACTS_URL,
      landmark.lon,
      landmark.lat,
      [f.coastalRating, f.wildfireRating, f.riverineRating, f.resilienceRating, f.tract],
      signal,
    );
    const row = rows[0];
    if (!row) {
      return {
        exposure: {
          hazard: "coastal",
          severity: 0,
          label: "Outside National Risk Index tracts",
          detail: "No census tract was found at this location.",
          method: "gis",
          source: hazardConfig("coastal").publisher,
        },
        coastalTract: null,
        context: {},
      };
    }
    const coastal = nriRatingSeverity(row[f.coastalRating]);
    return {
      exposure: {
        hazard: "coastal",
        severity: coastal.severity,
        label: coastal.label,
        detail: `Census tract ${row[f.tract] ?? "?"} has a FEMA coastal-flooding risk rating of "${row[f.coastalRating] ?? "not rated"}".`,
        method: "gis",
        source: hazardConfig("coastal").publisher,
      },
      resilience: resilienceFromRating(row[f.resilienceRating]),
      coastalTract: nriIndicatesCoastal(row[f.coastalRating]),
      context: {
        wildfireRating: row[f.wildfireRating] ?? undefined,
        riverineRating: row[f.riverineRating] ?? undefined,
        tract: row[f.tract] ?? undefined,
      },
    };
  } catch (err) {
    rethrowIfAborted(err, signal);
    return { exposure: unavailable("coastal", err), coastalTract: null, context: {} };
  }
}

/* ------------------------------------------------------------------------ */
/* FEMA flood zones                                                           */
/* ------------------------------------------------------------------------ */

/**
 * Determines whether a landmark intersects a FEMA flood hazard zone.
 *
 * LEARNING NOTE:
 * We use a spatial intersection here to determine whether a historic
 * landmark falls within a FEMA flood zone. This helps identify locations
 * that may face flood risk today — and that risk grows as seas rise and
 * heavy rainfall becomes more intense. If several overlapping zones are
 * returned, the most severe one wins.
 *
 * @param landmark Feature representing a historic site.
 * @param signal Optional AbortSignal.
 * @returns Flood exposure.
 */
export async function probeFlood(landmark: Landmark, signal?: AbortSignal): Promise<HazardExposure> {
  const f = FIELDS.flood;
  try {
    const rows = await queryFeaturesAtPoint<Record<string, string | null>>(
      FEMA_FLOOD_URL,
      landmark.lon,
      landmark.lat,
      [f.zone, f.subtype, f.sfha],
      signal,
    );
    const ranked = rows
      .map((r) => floodZoneSeverity(r[f.zone], r[f.subtype], r[f.sfha]))
      .sort((a, b) => b.severity - a.severity);
    const best = ranked[0] ?? floodZoneSeverity(null, null, null);
    return {
      hazard: "flood",
      severity: best.severity,
      label: best.label,
      detail:
        rows.length > 0
          ? `The landmark's coordinates intersect ${rows.length} FEMA flood-hazard polygon(s); the most severe is used.`
          : "No FEMA flood-hazard polygon intersects the landmark's coordinates (area of minimal hazard or not yet mapped).",
      method: "gis",
      source: hazardConfig("flood").publisher,
    };
  } catch (err) {
    rethrowIfAborted(err, signal);
    return unavailable("flood", err);
  }
}

/* ------------------------------------------------------------------------ */
/* USDA Forest Service Wildfire Hazard Potential                              */
/* ------------------------------------------------------------------------ */

/**
 * Reads the Wildfire Hazard Potential class under a landmark.
 *
 * LEARNING NOTE:
 * WHP does not predict where a fire WILL start; it estimates how hard a fire
 * would be to contain if one did, using burn probability and fire intensity
 * from simulations of thousands of fire seasons. High and very high classes
 * are where firefighters struggle — and where historic wooden structures
 * are most likely to be lost.
 *
 * @param landmark The landmark to probe.
 * @param signal Optional AbortSignal.
 * @returns Wildfire exposure.
 */
export async function probeWildfire(landmark: Landmark, signal?: AbortSignal): Promise<HazardExposure> {
  try {
    const value = await identifyImageValue(WHP_URL, landmark.lon, landmark.lat, signal);
    const result = wildfireSeverity(value);
    return {
      hazard: "wildfire",
      severity: result.severity,
      label: result.label,
      detail:
        value === null
          ? "The Wildfire Hazard Potential raster has no value here (outside mapped area)."
          : `The 270 m Wildfire Hazard Potential cell under the landmark is class ${value} (1 = very low … 5 = very high).`,
      method: "gis",
      source: hazardConfig("wildfire").publisher,
    };
  } catch (err) {
    rethrowIfAborted(err, signal);
    return unavailable("wildfire", err);
  }
}

/* ------------------------------------------------------------------------ */
/* NOAA sea-level rise                                                        */
/* ------------------------------------------------------------------------ */

/**
 * True when a NOAA identify result means "this pixel is inundated".
 *
 * LEARNING NOTE:
 * NOAA also publishes "low-lying areas" — land below the water line but not
 * hydrologically connected to the ocean (e.g. behind a dune). We ignore those
 * layers so we only count land the sea can actually reach.
 */
function isInundated(results: { layerName: string; value?: string; attributes?: Record<string, string> }[]): boolean {
  return results.some((r) => {
    if (/low/i.test(r.layerName)) return false;
    const raw = r.attributes?.["Pixel Value"] ?? r.value ?? "";
    return raw !== "" && !/nodata/i.test(raw);
  });
}

/**
 * Tests whether a landmark falls inside NOAA's projected sea-level-rise
 * inundation for +2 ft and, if so, +1 ft.
 *
 * LEARNING NOTE:
 * Inundation is monotonic: anything underwater at +1 ft is also underwater
 * at +2 ft. So we test +2 ft first; when it is dry we can skip +1 ft and
 * save a request. Small optimizations like this matter when you analyze
 * thousands of places.
 *
 * @param landmark The landmark to probe.
 * @param signal Optional AbortSignal.
 * @returns Sea-level-rise exposure.
 */
export async function probeSeaLevel(landmark: Landmark, signal?: AbortSignal): Promise<HazardExposure> {
  try {
    const wet2 = isInundated(await identifyMapService(slrServiceUrl(SLR_POSSIBLE_FEET), landmark.lon, landmark.lat, signal));
    const wet1 = wet2
      ? isInundated(await identifyMapService(slrServiceUrl(SLR_LIKELY_FEET), landmark.lon, landmark.lat, signal))
      : false;
    const result = seaLevelSeverity(wet1, wet2);
    return {
      hazard: "slr",
      severity: result.severity,
      label: result.label,
      detail: `NOAA inundation test at the landmark's coordinates: +${SLR_LIKELY_FEET} ft ${wet1 ? "wet" : "dry"}, +${SLR_POSSIBLE_FEET} ft ${wet2 ? "wet" : "dry"} (above today's average high tide, MHHW).`,
      method: "gis",
      source: hazardConfig("slr").publisher,
    };
  } catch (err) {
    rethrowIfAborted(err, signal);
    return unavailable("slr", err);
  }
}

/**
 * Exposure recorded when the sea-level test is skipped because the
 * landmark is clearly inland.
 * @param reason Why the test was skipped.
 */
export function seaLevelNotApplicable(reason: string): HazardExposure {
  return {
    hazard: "slr",
    severity: 0,
    label: "Inland — outside sea-level-rise zones",
    detail: reason,
    method: "gis",
    source: hazardConfig("slr").publisher,
  };
}
