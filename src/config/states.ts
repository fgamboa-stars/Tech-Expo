/**
 * ============================================================================
 * File:        src/config/states.ts
 * Purpose:     List of U.S. states (+ DC) used by the State Explorer dropdown,
 *              and which ones touch tidal water (used to decide when the
 *              sea-level-rise check is worth running).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial list (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

export interface StateInfo {
  abbr: string;
  name: string;
  /** Has ocean, Gulf or tidal-estuary shoreline covered by NOAA's SLR viewer. */
  coastal: boolean;
  /** Approximate center [lon, lat], used as a fallback when boundaries cannot load. */
  center: [number, number];
  /** Approximate map zoom level that fits the state. */
  zoom: number;
}

/**
 * LEARNING NOTE:
 * Pennsylvania and DC are marked coastal because the Delaware and Potomac
 * rivers are tidal there — NOAA's sea-level-rise data covers Philadelphia
 * and Washington, D.C.
 */
export const STATES: StateInfo[] = [
  { abbr: "AL", name: "Alabama", coastal: true, center: [-86.8, 32.8], zoom: 6 },
  { abbr: "AK", name: "Alaska", coastal: true, center: [-152.0, 63.5], zoom: 3 },
  { abbr: "AZ", name: "Arizona", coastal: false, center: [-111.7, 34.3], zoom: 6 },
  { abbr: "AR", name: "Arkansas", coastal: false, center: [-92.4, 34.9], zoom: 6 },
  { abbr: "CA", name: "California", coastal: true, center: [-119.5, 37.2], zoom: 5 },
  { abbr: "CO", name: "Colorado", coastal: false, center: [-105.5, 39.0], zoom: 6 },
  { abbr: "CT", name: "Connecticut", coastal: true, center: [-72.7, 41.6], zoom: 8 },
  { abbr: "DE", name: "Delaware", coastal: true, center: [-75.5, 39.0], zoom: 8 },
  { abbr: "DC", name: "District of Columbia", coastal: true, center: [-77.02, 38.9], zoom: 11 },
  { abbr: "FL", name: "Florida", coastal: true, center: [-82.5, 28.1], zoom: 6 },
  { abbr: "GA", name: "Georgia", coastal: true, center: [-83.4, 32.7], zoom: 6 },
  { abbr: "HI", name: "Hawaii", coastal: true, center: [-157.5, 20.6], zoom: 6 },
  { abbr: "ID", name: "Idaho", coastal: false, center: [-114.6, 44.4], zoom: 5 },
  { abbr: "IL", name: "Illinois", coastal: false, center: [-89.2, 40.0], zoom: 6 },
  { abbr: "IN", name: "Indiana", coastal: false, center: [-86.3, 39.9], zoom: 6 },
  { abbr: "IA", name: "Iowa", coastal: false, center: [-93.5, 42.1], zoom: 6 },
  { abbr: "KS", name: "Kansas", coastal: false, center: [-98.4, 38.5], zoom: 6 },
  { abbr: "KY", name: "Kentucky", coastal: false, center: [-85.3, 37.5], zoom: 6 },
  { abbr: "LA", name: "Louisiana", coastal: true, center: [-91.9, 31.0], zoom: 6 },
  { abbr: "ME", name: "Maine", coastal: true, center: [-69.2, 45.3], zoom: 6 },
  { abbr: "MD", name: "Maryland", coastal: true, center: [-76.8, 39.0], zoom: 7 },
  { abbr: "MA", name: "Massachusetts", coastal: true, center: [-71.8, 42.3], zoom: 7 },
  { abbr: "MI", name: "Michigan", coastal: false, center: [-85.4, 44.3], zoom: 6 },
  { abbr: "MN", name: "Minnesota", coastal: false, center: [-94.3, 46.3], zoom: 5 },
  { abbr: "MS", name: "Mississippi", coastal: true, center: [-89.7, 32.7], zoom: 6 },
  { abbr: "MO", name: "Missouri", coastal: false, center: [-92.5, 38.4], zoom: 6 },
  { abbr: "MT", name: "Montana", coastal: false, center: [-109.6, 47.0], zoom: 5 },
  { abbr: "NE", name: "Nebraska", coastal: false, center: [-99.8, 41.5], zoom: 6 },
  { abbr: "NV", name: "Nevada", coastal: false, center: [-116.6, 39.3], zoom: 5 },
  { abbr: "NH", name: "New Hampshire", coastal: true, center: [-71.6, 43.7], zoom: 7 },
  { abbr: "NJ", name: "New Jersey", coastal: true, center: [-74.6, 40.1], zoom: 7 },
  { abbr: "NM", name: "New Mexico", coastal: false, center: [-106.1, 34.4], zoom: 6 },
  { abbr: "NY", name: "New York", coastal: true, center: [-75.5, 42.9], zoom: 6 },
  { abbr: "NC", name: "North Carolina", coastal: true, center: [-79.4, 35.5], zoom: 6 },
  { abbr: "ND", name: "North Dakota", coastal: false, center: [-100.5, 47.5], zoom: 6 },
  { abbr: "OH", name: "Ohio", coastal: false, center: [-82.8, 40.3], zoom: 6 },
  { abbr: "OK", name: "Oklahoma", coastal: false, center: [-97.5, 35.6], zoom: 6 },
  { abbr: "OR", name: "Oregon", coastal: true, center: [-120.6, 44.0], zoom: 6 },
  { abbr: "PA", name: "Pennsylvania", coastal: true, center: [-77.6, 40.9], zoom: 6 },
  { abbr: "RI", name: "Rhode Island", coastal: true, center: [-71.5, 41.7], zoom: 9 },
  { abbr: "SC", name: "South Carolina", coastal: true, center: [-80.9, 33.9], zoom: 7 },
  { abbr: "SD", name: "South Dakota", coastal: false, center: [-100.2, 44.4], zoom: 6 },
  { abbr: "TN", name: "Tennessee", coastal: false, center: [-86.3, 35.8], zoom: 6 },
  { abbr: "TX", name: "Texas", coastal: true, center: [-99.3, 31.4], zoom: 5 },
  { abbr: "UT", name: "Utah", coastal: false, center: [-111.7, 39.3], zoom: 6 },
  { abbr: "VT", name: "Vermont", coastal: false, center: [-72.7, 44.0], zoom: 7 },
  { abbr: "VA", name: "Virginia", coastal: true, center: [-78.8, 37.5], zoom: 6 },
  { abbr: "WA", name: "Washington", coastal: true, center: [-120.5, 47.4], zoom: 6 },
  { abbr: "WV", name: "West Virginia", coastal: false, center: [-80.6, 38.6], zoom: 7 },
  { abbr: "WI", name: "Wisconsin", coastal: false, center: [-89.9, 44.6], zoom: 6 },
  { abbr: "WY", name: "Wyoming", coastal: false, center: [-107.6, 43.0], zoom: 6 },
];

const BY_ABBR = new Map(STATES.map((s) => [s.abbr, s]));

/**
 * Finds a state by its two-letter abbreviation.
 * @param abbr e.g. "LA"
 * @returns The state's info, or undefined if unknown.
 */
export function getState(abbr: string | undefined | null): StateInfo | undefined {
  if (!abbr) return undefined;
  return BY_ABBR.get(abbr.toUpperCase());
}

/**
 * Returns a state's display name, falling back to the abbreviation.
 * @param abbr e.g. "LA"
 */
export function stateName(abbr: string): string {
  return getState(abbr)?.name ?? abbr;
}
