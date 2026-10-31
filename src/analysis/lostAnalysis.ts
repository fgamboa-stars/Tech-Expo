/**
 * ============================================================================
 * File:        src/analysis/lostAnalysis.ts
 * Purpose:     Pure functions for Lost America: filtering (state, decade,
 *              cause, text), dashboard calculations, and the generated
 *              narrative sentences ("Built in 1887, this landmark stood for
 *              over a century before being demolished…").
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Like the climate-risk engine, this module has no React and no ArcGIS code.
 * The page, the map and the dashboard all call the SAME filter and summary
 * functions, so a filter can never show one number on the map and another
 * on a chart. It also makes everything here easy to unit-test.
 */
import { lossCause } from "../config/lostCauses";
import { stateName } from "../config/states";
import type { LossCause, LostFilters, LostPlace, LostSummary } from "../types/lost";
import { LOSS_CAUSES } from "../types/lost";

/** Filters that show everything. */
export const ALL_LOST_FILTERS: LostFilters = { state: "", decade: null, causes: [...LOSS_CAUSES], query: "" };

/**
 * Returns the decade a year falls in (1967 → 1960).
 * @param year A four-digit year, or null.
 * @returns The decade, or null when the year is unknown.
 */
export function decadeOf(year: number | null | undefined): number | null {
  return typeof year === "number" && Number.isFinite(year) ? Math.floor(year / 10) * 10 : null;
}

/** Formats a decade for labels: 1960 → "1960s", null → "Unknown". */
export function decadeLabel(decade: number | null): string {
  return decade === null ? "Unknown" : `${decade}s`;
}

/**
 * Applies the Lost America filters.
 *
 * LEARNING NOTE — filtering workflow:
 * Filters combine with AND: a place must match the state AND the decade AND
 * one of the selected causes AND the search text. Each test is cheap, so we
 * simply re-run the whole filter whenever any control changes; with a few
 * hundred places this takes well under a millisecond.
 *
 * @param places All lost places.
 * @param f Current filters.
 * @returns The places that match, in the original order.
 */
export function filterLostPlaces(places: LostPlace[], f: LostFilters): LostPlace[] {
  const q = f.query.trim().toLowerCase();
  return places.filter(
    (p) =>
      (!f.state || p.state === f.state) &&
      (f.decade === null || decadeOf(p.yearLost) === f.decade) &&
      f.causes.includes(p.cause) &&
      (!q || p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)),
  );
}

/**
 * Lists the decades that appear in the data (for the decade dropdown).
 * @param places Lost places.
 * @returns Distinct decades, oldest first.
 */
export function availableDecades(places: LostPlace[]): number[] {
  return [...new Set(places.map((p) => decadeOf(p.yearLost)).filter((d): d is number => d !== null))].sort((a, b) => a - b);
}

/**
 * Years a place stood before it was lost.
 * @returns Whole years, or null when either date is unknown.
 */
export function yearsStood(p: LostPlace): number | null {
  return p.yearBuilt !== null && p.yearLost !== null ? p.yearLost - p.yearBuilt : null;
}

/** Turns a span of years into natural language ("for over a century"). */
function spanPhrase(years: number): string {
  if (years >= 200) return "for more than two centuries";
  if (years >= 150) return "for over a century and a half";
  if (years >= 100) return "for over a century";
  if (years >= 90) return "for nearly a century";
  if (years === 1) return "for a single year";
  return `for ${years} years`;
}

/**
 * Writes the short narrative summary shown in the storytelling panel and
 * the Then vs Now card.
 *
 * LEARNING NOTE:
 * Templated sentences turn data fields into a story a visitor can read in a
 * few seconds. When a field is missing (e.g. no build year for a natural
 * site), the template falls back to the recorded description instead of
 * inventing a date.
 *
 * @param p A lost place.
 * @returns One or two sentences.
 */
export function narrativeFor(p: LostPlace): string {
  const stood = yearsStood(p);
  const verb = lossCause(p.cause).verb;
  if (stood !== null && p.yearBuilt !== null && p.yearLost !== null) {
    const built = p.builtLabel ?? String(p.yearBuilt);
    const opener = p.builtLabel?.startsWith("c.") ? `Built ${built}` : `Built in ${built}`;
    return `${opener}, ${p.name} stood ${spanPhrase(stood)} before being ${verb} in ${p.yearLost}. ${p.today}`;
  }
  return `${p.builtLabel ? `${p.builtLabel}. ` : ""}${p.causeDetail} ${p.today}`;
}

/**
 * Computes every Lost America metric for the dashboard and page header.
 *
 * LEARNING NOTE — dashboard calculations:
 *  - counts by state / decade / cause use one pass and a Map each;
 *  - "oldest" = earliest known build year; "most recent" = latest loss year;
 *  - the median (not the mean) of years-stood is used so a single very old
 *    place does not distort the typical value.
 *
 * @param places Lost places (already filtered, if needed).
 * @returns The summary.
 */
export function summarizeLost(places: LostPlace[]): LostSummary {
  const stateMap = new Map<string, number>();
  const decadeMap = new Map<number | null, number>();
  const causeMap = new Map<LossCause, number>();
  for (const p of places) {
    stateMap.set(p.state, (stateMap.get(p.state) ?? 0) + 1);
    const d = decadeOf(p.yearLost);
    decadeMap.set(d, (decadeMap.get(d) ?? 0) + 1);
    causeMap.set(p.cause, (causeMap.get(p.cause) ?? 0) + 1);
  }

  const byState = [...stateMap.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
  const byDecade = [...decadeMap.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => (a.decade ?? Infinity) - (b.decade ?? Infinity));
  const byCause = LOSS_CAUSES.filter((c) => causeMap.has(c))
    .map((cause) => ({ cause, count: causeMap.get(cause)! }))
    .sort((a, b) => b.count - a.count);

  const withBuilt = places.filter((p) => p.yearBuilt !== null);
  const oldest = withBuilt.reduce<LostPlace | undefined>((best, p) => (!best || p.yearBuilt! < best.yearBuilt! ? p : best), undefined);
  const withLost = places.filter((p) => p.yearLost !== null);
  const mostRecent = withLost.reduce<LostPlace | undefined>((best, p) => (!best || p.yearLost! > best.yearLost! ? p : best), undefined);

  const spans = places.map(yearsStood).filter((n): n is number => n !== null).sort((a, b) => a - b);
  const medianYearsStood = spans.length
    ? spans.length % 2
      ? spans[(spans.length - 1) / 2]
      : Math.round((spans[spans.length / 2 - 1] + spans[spans.length / 2]) / 2)
    : null;

  const summary: LostSummary = { total: places.length, byState, byDecade, byCause, oldest, mostRecent, medianYearsStood, statements: [] };
  summary.statements = lostStatements(summary);
  return summary;
}

/**
 * Generates plain-language Lost America findings.
 * @param s The summary.
 * @returns Sentences, most important first.
 */
export function lostStatements(s: LostSummary): string[] {
  if (s.total === 0) return ["No lost places match these filters."];
  const out: string[] = [];
  const top = s.byCause[0];
  if (top) {
    out.push(
      `${top.count} of ${s.total} places on this map were ${lossCause(top.cause).verb} — the most common way historic places are lost.`,
    );
  }
  if (s.medianYearsStood !== null) out.push(`The typical place stood ${s.medianYearsStood} years before it was lost.`);
  const climate = s.byCause.filter((c) => c.cause === "burned" || c.cause === "destroyed" || c.cause === "submerged").reduce((n, c) => n + c.count, 0);
  if (climate > 0) out.push(`${climate} were lost to fire, storms or rising water — the same forces the climate-risk analysis measures for places still standing.`);
  if (s.oldest) out.push(`The oldest, ${s.oldest.name}, was built ${s.oldest.builtLabel ?? `in ${s.oldest.yearBuilt}`}.`);
  if (s.mostRecent) out.push(`The most recent loss: ${s.mostRecent.name} (${stateName(s.mostRecent.state)}), ${s.mostRecent.yearLost}.`);
  return out;
}
