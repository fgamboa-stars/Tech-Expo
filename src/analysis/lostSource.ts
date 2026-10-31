/**
 * ============================================================================
 * File:        src/analysis/lostSource.ts
 * Purpose:     Live data loading for Lost America from the National Park
 *              Service: how many properties have been removed from the
 *              National Register of Historic Places.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — data loading:
 * `returnCountOnly=true` asks the server to count matching features without
 * sending them — one tiny request instead of downloading thousands of
 * points. The map draws the same features separately (with clustering), so
 * the count and the dots always come from the same where-clause below.
 */
import { FIELDS, NRHP_POINTS_URL } from "../config/layers";
import { fetchArcgisJson } from "./arcgisRest";

/** SQL where-clause selecting National Register listings that were removed. */
export const REMOVED_WHERE = `${FIELDS.nrhp.status} = 'Removed'`;

/**
 * Counts properties removed from the National Register (NPS service).
 * @param signal Optional AbortSignal.
 * @returns The count, or null if the service cannot be reached.
 */
export async function countRemovedListings(signal?: AbortSignal): Promise<number | null> {
  try {
    const res = await fetchArcgisJson<{ count?: number }>(
      `${NRHP_POINTS_URL}/query`,
      { where: REMOVED_WHERE, returnCountOnly: true },
      signal,
    );
    return typeof res.count === "number" ? res.count : null;
  } catch {
    return null;
  }
}
