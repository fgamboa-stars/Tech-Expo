/**
 * ============================================================================
 * File:        src/config/lostCauses.ts
 * Purpose:     Display settings for each cause of loss (labels, wording for
 *              generated narratives, map marker shapes) plus the archive and
 *              image services Lost America uses.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial configuration (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — shape AND color:
 * Six causes are more than color alone can reliably separate for people
 * with color-vision deficiencies, especially when points overlap on a map.
 * So each cause also gets its own marker shape (square, triangle, diamond…),
 * and the filters and legend always print the cause name. Colors carry a
 * second message: losses to natural forces (fire, storm, water) are colored;
 * losses to human decisions (demolition, relocation) are gray.
 */
import { readEnv } from "./appConfig";
import type { LossCause } from "../types/lost";

export interface LossCauseConfig {
  id: LossCause;
  /** Label for filters, legends and charts. */
  label: string;
  /** Past-tense phrase for generated narratives ("before being ___"). */
  verb: string;
  /** ArcGIS SimpleMarkerSymbol style used on the map. */
  marker: "circle" | "square" | "diamond" | "triangle" | "cross" | "x";
}

/** Causes in display order (this order also fixes their colors). */
export const LOSS_CAUSE_CONFIG: LossCauseConfig[] = [
  { id: "demolished", label: "Demolished", verb: "demolished", marker: "square" },
  { id: "burned", label: "Burned", verb: "destroyed by fire", marker: "triangle" },
  { id: "destroyed", label: "Destroyed by disaster", verb: "destroyed by disaster", marker: "diamond" },
  { id: "submerged", label: "Submerged", verb: "submerged", marker: "circle" },
  { id: "relocated", label: "Relocated", verb: "moved from its original site", marker: "cross" },
  { id: "removed", label: "Removed / other", verb: "lost", marker: "x" },
];

/**
 * Looks up a cause's configuration.
 * @param id Cause id.
 */
export function lossCause(id: LossCause): LossCauseConfig {
  return LOSS_CAUSE_CONFIG.find((c) => c.id === id) ?? LOSS_CAUSE_CONFIG[LOSS_CAUSE_CONFIG.length - 1];
}

/**
 * Wikipedia REST "page summary" endpoint, used to fetch an article's lead
 * image as the historic photo. `{title}` is replaced with the article title.
 */
export const WIKIPEDIA_SUMMARY_URL =
  readEnv("VITE_WIKIPEDIA_SUMMARY_URL") ?? "https://en.wikipedia.org/api/rest_v1/page/summary/{title}";

/**
 * Builds a Library of Congress search link limited to the Historic American
 * Buildings Survey / Engineering Record / Landscapes Survey collection.
 * @param query Words to search for.
 */
export function locHabsSearchUrl(query: string): string {
  return `https://www.loc.gov/pictures/search/?q=${encodeURIComponent(query)}&co=hh`;
}

/**
 * Builds a link to a property's National Register file in the NPS NPGallery
 * (nomination form and the original nomination photographs).
 * @param nrisRef The 8-digit NRHP reference number, e.g. "76001095".
 */
export function npGalleryUrl(nrisRef: string): string {
  return `https://npgallery.nps.gov/AssetDetail/NRIS/${encodeURIComponent(nrisRef)}`;
}

/**
 * Builds a general Library of Congress search link (photos, maps, newspapers).
 * @param query Words to search for.
 */
export function locSearchUrl(query: string): string {
  return `https://www.loc.gov/search/?q=${encodeURIComponent(query)}`;
}
