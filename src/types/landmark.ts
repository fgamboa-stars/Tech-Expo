/**
 * ============================================================================
 * File:        src/types/landmark.ts
 * Purpose:     Type definition for a historic landmark (a point on the map).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial types (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/** Where a landmark record came from. */
export type LandmarkSource =
  /** The curated reference set bundled with the app (src/data/referenceLandmarks.ts). */
  | "reference"
  /** The National Register of Historic Places service (NPS), loaded live or by the analyze script. */
  | "nrhp";

/** A historic place, stored as a point in WGS84 longitude/latitude. */
export interface Landmark {
  /** Stable unique id (NRHP reference number when available). */
  id: string;
  name: string;
  /** Two-letter state abbreviation, e.g. "FL". */
  state: string;
  city?: string;
  /** Longitude in decimal degrees (WGS84, EPSG:4326). */
  lon: number;
  /** Latitude in decimal degrees (WGS84, EPSG:4326). */
  lat: number;
  /** True when designated a National Historic Landmark (the highest federal tier). */
  isNHL: boolean;
  /** Short description of why the place matters. */
  significance?: string;
  source: LandmarkSource;
}
