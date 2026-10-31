/**
 * ============================================================================
 * File:        src/types/lost.ts
 * Purpose:     Types for the Lost America feature: historic places that no
 *              longer exist (or no longer stand where they were built).
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial types (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */

/**
 * Why a place was lost.
 *  - demolished: deliberately torn down
 *  - burned:     destroyed by fire (wildfire or structure fire)
 *  - destroyed:  destroyed by a storm, flood or other disaster
 *  - submerged:  flooded permanently (reservoirs, land loss)
 *  - relocated:  moved away from its original site
 *  - removed:    otherwise lost or removed (e.g. delisted with no other detail)
 */
export type LossCause = "demolished" | "burned" | "destroyed" | "submerged" | "relocated" | "removed";

export const LOSS_CAUSES: LossCause[] = ["demolished", "burned", "destroyed", "submerged", "relocated", "removed"];

/** A link to an archive record or source. */
export interface ArchiveLink {
  /** Human-readable name of the archive or document. */
  label: string;
  url?: string;
}

/** A historic place that has been lost. */
export interface LostPlace {
  id: string;
  name: string;
  city: string;
  /** Two-letter state code. */
  state: string;
  /** Longitude/latitude of the original site (WGS84). */
  lon: number;
  lat: number;
  /** Year built, or null when not applicable (e.g. a natural or cultural landscape). */
  yearBuilt: number | null;
  /** Optional display text for the build date, e.g. "c. 1856" or "In use for over 10,000 years". */
  builtLabel?: string;
  /** Year lost, or null when unknown. */
  yearLost: number | null;
  cause: LossCause;
  /** One sentence describing how it was lost. */
  causeDetail: string;
  /** Why the place mattered. */
  significance: string;
  /** What remains on the site today. */
  today: string;
  /** Primary archive source (e.g. Library of Congress HABS). */
  archive: ArchiveLink;
  /** Original National Register nomination (often includes the nomination photos). */
  nomination?: ArchiveLink;
  /** Fact source for the loss (news report, agency page). */
  citation?: ArchiveLink;
  /** English Wikipedia article whose lead image is used as the historic photo. */
  wikipediaTitle?: string;
  /** Show this place in the storytelling panel. */
  featured?: boolean;
}

/** Filters applied on the Lost America page (and the dashboard). */
export interface LostFilters {
  /** Two-letter state code, or "" for all states. */
  state: string;
  /** Decade of loss (e.g. 1960), or null for all decades. */
  decade: number | null;
  /** Causes to include; an empty list shows nothing. */
  causes: LossCause[];
  /** Free-text search on name and city. */
  query: string;
}

/** Aggregated numbers for the dashboard and page header. */
export interface LostSummary {
  total: number;
  byState: { state: string; count: number }[];
  /** Chronological; `decade` null collects unknown dates. */
  byDecade: { decade: number | null; count: number }[];
  byCause: { cause: LossCause; count: number }[];
  /** Earliest-built place with a known build year. */
  oldest?: LostPlace;
  /** Place with the latest loss year. */
  mostRecent?: LostPlace;
  /** Median years a place stood before it was lost. */
  medianYearsStood: number | null;
  /** Auto-generated plain-language statements. */
  statements: string[];
}

/** A historic image found for a place. */
export interface ArchiveImage {
  src: string;
  /** Page where the image and its license are described. */
  pageUrl: string;
  /** Short credit line. */
  credit: string;
  width?: number;
  height?: number;
}
