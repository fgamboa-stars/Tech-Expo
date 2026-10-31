/**
 * ============================================================================
 * File:        src/analysis/landmarkSource.ts
 * Purpose:     Loads historic landmarks from the National Register of
 *              Historic Places service and assigns each one to a state
 *              using state boundary polygons from ArcGIS Living Atlas.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — state filtering workflow:
 *  1. Download the 50 state + DC boundary polygons once (cached).
 *  2. Ask the NRHP service for landmarks inside the selected state's
 *     bounding box (a fast rectangular filter the server can index).
 *  3. Test each returned point against the state polygons on the client
 *     (point-in-polygon) to drop points that are in the box but in a
 *     neighboring state.
 * This "coarse filter on the server, fine filter on the client" pattern is
 * common in GIS apps because rectangles are cheap and polygons are not.
 */
import { FIELDS, NRHP_POINTS_URL, STATES_URL } from "../config/layers";
import { getState } from "../config/states";
import type { Landmark } from "../types/landmark";
import { fetchArcgisJson, queryAllFeatures, ServiceError, type EsriFeature } from "./arcgisRest";
import { bboxContains, isValidLonLat, pointInPolygon, polygonBBox, type BBox, type EsriPolygon } from "./geometry";

/** A state boundary ready for point-in-polygon tests. */
export interface StateBoundary {
  abbr: string;
  name: string;
  polygon: EsriPolygon;
  bbox: BBox;
}

/** Which landmarks to load. */
export type LandmarkScope =
  /** National Historic Landmarks only (~2,600 nationwide) — fast, the default. */
  | "nhl"
  /** Every listed NRHP property (~97,000 nationwide) — slow, use per state. */
  | "all";

let boundaryCache: Promise<StateBoundary[]> | null = null;

/**
 * Downloads (once) the generalized boundaries of all states.
 *
 * LEARNING NOTE:
 * `maxAllowableOffset` asks the server to simplify shapes to ~1 km
 * precision. That shrinks the download ~50× and is plenty to decide which
 * state a point is in. `outSR=4326` returns plain longitude/latitude.
 *
 * @param signal Optional AbortSignal.
 * @returns One boundary per state.
 */
export function loadStateBoundaries(signal?: AbortSignal): Promise<StateBoundary[]> {
  if (!boundaryCache) {
    boundaryCache = fetchArcgisJson<{ features?: EsriFeature<Record<string, string>>[] }>(
      `${STATES_URL}/query`,
      {
        where: "1=1",
        outFields: `${FIELDS.states.abbr},${FIELDS.states.name}`,
        returnGeometry: true,
        outSR: 4326,
        maxAllowableOffset: 0.01,
        geometryPrecision: 4,
      },
      signal,
    )
      .then((res) =>
        (res.features ?? [])
          .filter((f) => f.geometry?.rings?.length)
          .map((f) => {
            const polygon: EsriPolygon = { rings: f.geometry!.rings! };
            return {
              abbr: String(f.attributes[FIELDS.states.abbr]),
              name: String(f.attributes[FIELDS.states.name]),
              polygon,
              bbox: polygonBBox(polygon),
            };
          }),
      )
      .catch((err) => {
        boundaryCache = null; // allow a retry later
        throw err;
      });
  }
  return boundaryCache;
}

/**
 * Finds which state contains a point.
 *
 * LEARNING NOTE:
 * Generalized coastlines can cut off tiny islands (Fort Jefferson sits on a
 * 16-acre key 70 miles offshore). When no polygon contains the point we fall
 * back to the state whose boundary vertex is closest — a simple, robust
 * "snap to nearest" rule.
 *
 * @param lon Longitude.
 * @param lat Latitude.
 * @param boundaries State boundaries from loadStateBoundaries.
 * @returns Two-letter state abbreviation, or undefined if far from every state.
 */
export function assignState(lon: number, lat: number, boundaries: StateBoundary[]): string | undefined {
  for (const b of boundaries) {
    if (bboxContains(b.bbox, lon, lat) && pointInPolygon(lon, lat, b.polygon)) return b.abbr;
  }
  let best: { abbr: string; d2: number } | undefined;
  for (const b of boundaries) {
    for (const ring of b.polygon.rings) {
      for (let i = 0; i < ring.length; i += 2) {
        const dx = ring[i][0] - lon;
        const dy = ring[i][1] - lat;
        const d2 = dx * dx + dy * dy;
        if (!best || d2 < best.d2) best = { abbr: b.abbr, d2 };
      }
    }
  }
  // ~2 degrees ≈ 200 km: beyond that, the point is not in a U.S. state (e.g. a territory).
  return best && best.d2 < 4 ? best.abbr : undefined;
}

/** Picks the first non-empty attribute among candidate field names. */
function firstAttr(attrs: Record<string, unknown>, candidates: readonly string[]): string | undefined {
  for (const name of candidates) {
    const v = attrs[name];
    if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

/**
 * Converts an NRHP feature into our Landmark type.
 * @returns A Landmark, or null if the record has no usable location or state.
 */
function toLandmark(f: EsriFeature, boundaries: StateBoundary[]): Landmark | null {
  const lon = f.geometry?.x;
  const lat = f.geometry?.y;
  if (!isValidLonLat(lon, lat)) return null;
  const a = f.attributes;
  const stateAttr = firstAttr(a, ["STATE", "State", "STATE_ABBR"]);
  const state = (stateAttr && getState(stateAttr)?.abbr) || assignState(lon, lat!, boundaries);
  if (!state) return null;
  const ref = firstAttr(a, FIELDS.nrhp.refCandidates) ?? firstAttr(a, ["OBJECTID"]) ?? `${lon},${lat}`;
  return {
    id: `nrhp-${ref}`,
    name: firstAttr(a, [FIELDS.nrhp.name]) ?? "Unnamed historic property",
    state,
    city: firstAttr(a, FIELDS.nrhp.cityCandidates),
    lon,
    lat: lat!,
    isNHL: String(a[FIELDS.nrhp.isNhl] ?? "").toUpperCase() === "X",
    source: "nrhp",
  };
}

/** Builds the SQL where-clause for a scope. */
function scopeWhere(scope: LandmarkScope, includeStatus: boolean): string {
  const parts: string[] = [];
  if (scope === "nhl") parts.push(`${FIELDS.nrhp.isNhl} = 'X'`);
  if (includeStatus) parts.push(`(${FIELDS.nrhp.status} IS NULL OR ${FIELDS.nrhp.status} <> 'Removed')`);
  return parts.length ? parts.join(" AND ") : "1=1";
}

/**
 * Queries NRHP points, retrying with a simpler where-clause if the service
 * rejects a field (services occasionally rename fields).
 */
async function queryNrhp(
  scope: LandmarkScope,
  extra: Record<string, string | number | boolean>,
  signal?: AbortSignal,
  onPage?: (n: number) => void,
): Promise<EsriFeature[]> {
  const base = { outFields: "*", returnGeometry: true, outSR: 4326, ...extra };
  try {
    return await queryAllFeatures(NRHP_POINTS_URL, { ...base, where: scopeWhere(scope, true) }, 1000, signal, onPage);
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err;
    return queryAllFeatures(NRHP_POINTS_URL, { ...base, where: scopeWhere(scope, false), orderByFields: "" }, 1000, signal, onPage);
  }
}

/**
 * Loads the historic landmarks inside one state.
 *
 * @param stateAbbr Two-letter state code, e.g. "LA".
 * @param scope "nhl" (National Historic Landmarks) or "all" (every NRHP listing).
 * @param signal Optional AbortSignal.
 * @param onPage Progress callback with the number of records fetched so far.
 * @returns Landmarks located in the state, de-duplicated by id.
 */
export async function loadLandmarksForState(
  stateAbbr: string,
  scope: LandmarkScope,
  signal?: AbortSignal,
  onPage?: (n: number) => void,
): Promise<Landmark[]> {
  const boundaries = await loadStateBoundaries(signal);
  const target = boundaries.find((b) => b.abbr === stateAbbr);
  if (!target) throw new Error(`No boundary found for state ${stateAbbr}`);
  // Pad the box by ~20 km so islands just off a generalized coastline are included.
  const pad = 0.2;
  const { xmin, ymin, xmax, ymax } = target.bbox;
  const features = await queryNrhp(
    scope,
    {
      geometry: `${xmin - pad},${ymin - pad},${xmax + pad},${ymax + pad}`,
      geometryType: "esriGeometryEnvelope",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
    },
    signal,
    onPage,
  );
  return dedupe(features.map((f) => toLandmark(f, boundaries)).filter((l): l is Landmark => l?.state === stateAbbr));
}

/**
 * Loads landmarks for the whole country (used by scripts/run-analysis.ts).
 * @param scope "nhl" recommended; "all" is ~97,000 records.
 * @param signal Optional AbortSignal.
 * @param onPage Progress callback.
 */
export async function loadNationalLandmarks(
  scope: LandmarkScope,
  signal?: AbortSignal,
  onPage?: (n: number) => void,
): Promise<Landmark[]> {
  const boundaries = await loadStateBoundaries(signal);
  const features = await queryNrhp(scope, {}, signal, onPage);
  return dedupe(features.map((f) => toLandmark(f, boundaries)).filter((l): l is Landmark => l !== null));
}

/** Removes duplicate ids (multi-part listings can appear more than once). */
function dedupe(list: Landmark[]): Landmark[] {
  const seen = new Map<string, Landmark>();
  for (const l of list) if (!seen.has(l.id)) seen.set(l.id, l);
  return [...seen.values()];
}
