/**
 * ============================================================================
 * File:        src/analysis/findings.ts
 * Purpose:     Aggregates risk assessments into dashboard numbers and writes
 *              the plain-language findings that answer the research question:
 *              "Which historic landmarks could be underwater or burned by 2050?"
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial findings generator (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * A map shows WHERE; findings say SO WHAT. Judges and community members
 * rarely have time to explore every point, so the app turns the numbers
 * into sentences automatically. Because the sentences are computed from the
 * same assessments as the charts, they update whenever the data does —
 * nothing is hard-coded.
 */
import { stateName } from "../config/states";
import type { DatasetMode, FindingsSummary, RiskAssessment, RiskClass } from "../types/analysis";
import { RISK_CLASSES } from "../types/analysis";
import type { HazardId } from "../types/hazard";
import { HAZARD_IDS } from "../types/hazard";

const WATER_HAZARDS: HazardId[] = ["flood", "slr", "coastal"];

/** Severity of one hazard in an assessment (null counts as 0). */
export function severityOf(a: RiskAssessment, hazard: HazardId): number {
  return a.exposures.find((e) => e.hazard === hazard)?.severity ?? 0;
}

/** True when any water hazard is elevated (≥ 2): the "underwater" half of the question. */
export function isWaterThreatened(a: RiskAssessment): boolean {
  return WATER_HAZARDS.some((h) => severityOf(a, h) >= 2);
}

/** True when wildfire is elevated (≥ 2): the "burned" half of the question. */
export function isFireThreatened(a: RiskAssessment): boolean {
  return severityOf(a, "wildfire") >= 2;
}

/** Formats "1 landmark" / "3 landmarks". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString("en-US")} ${n === 1 ? singular : pluralForm}`;
}

/** Joins ["A","B","C"] as "A, B and C". */
function listJoin(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Ranks assessments from most to least vulnerable.
 * Ties on score are broken by number of elevated hazards, then by name.
 */
export function rankByVulnerability(list: RiskAssessment[]): RiskAssessment[] {
  return [...list].sort(
    (a, b) =>
      b.score - a.score ||
      b.significantHazards.length - a.significantHazards.length ||
      a.landmark.name.localeCompare(b.landmark.name),
  );
}

/**
 * Builds every number the dashboard and story need, plus the findings text.
 *
 * @param assessments Risk assessments to summarize (any dataset or filter).
 * @param mode Which dataset the assessments come from; changes how the
 *             headline sentence is worded (see generateStatements).
 * @returns The aggregated summary.
 */
export function summarize(assessments: RiskAssessment[], mode: DatasetMode = "national-gis"): FindingsSummary {
  const byClass = Object.fromEntries(RISK_CLASSES.map((c) => [c, 0])) as Record<RiskClass, number>;
  const byHazard = Object.fromEntries(HAZARD_IDS.map((h) => [h, 0])) as Record<HazardId, number>;
  const stateMap = new Map<string, { threatened: number; analyzed: number }>();

  let threatened = 0;
  let multiHazard = 0;
  let waterAndFire = 0;
  let underwater = 0;
  let burned = 0;

  for (const a of assessments) {
    byClass[a.riskClass]++;
    for (const h of HAZARD_IDS) if (severityOf(a, h) >= 2) byHazard[h]++;
    const s = stateMap.get(a.landmark.state) ?? { threatened: 0, analyzed: 0 };
    s.analyzed++;
    if (a.threatened) {
      threatened++;
      s.threatened++;
    }
    stateMap.set(a.landmark.state, s);
    if (a.multiHazard) multiHazard++;
    const water = isWaterThreatened(a);
    const fire = isFireThreatened(a);
    if (water) underwater++;
    if (fire) burned++;
    if (water && fire) waterAndFire++;
  }

  const byState = [...stateMap.entries()]
    .map(([state, v]) => ({ state, ...v }))
    .sort((a, b) => b.threatened - a.threatened || b.analyzed - a.analyzed || a.state.localeCompare(b.state));

  const ranked = rankByVulnerability(assessments);
  const summary: FindingsSummary = {
    analyzed: assessments.length,
    threatened,
    byClass,
    byHazard,
    byState,
    multiHazard,
    waterAndFire,
    underwater,
    burned,
    top10: ranked.slice(0, 10),
    statements: [],
  };
  summary.statements = generateStatements(summary, ranked, mode);
  return summary;
}

/**
 * Writes the auto-generated findings.
 *
 * LEARNING NOTE:
 * Each sentence maps to one part of the research question, and every number
 * comes from `summary`. If a category is empty, its sentence is skipped
 * rather than printing "0 landmarks…", which reads like an error.
 *
 * LEARNING NOTE — honest statistics:
 * The reference set was CHOSEN because sources document a threat, so "100%
 * are threatened" would be a meaningless (circular) statistic. In that mode
 * the headline describes the set instead of quoting a rate. Only a GIS
 * analysis of every landmark in an area supports a percentage.
 *
 * @param s Aggregated summary.
 * @param ranked Assessments ranked by vulnerability.
 * @param mode Dataset the numbers come from.
 * @returns Findings, most important first.
 */
export function generateStatements(s: FindingsSummary, ranked: RiskAssessment[], mode: DatasetMode = "national-gis"): string[] {
  if (s.analyzed === 0) return ["No landmarks have been analyzed yet. Choose a state and run the analysis to generate findings."];
  const out: string[] = [];
  const pct = Math.round((100 * s.threatened) / s.analyzed);

  if (mode === "reference") {
    out.push(
      `The reference set holds ${plural(s.analyzed, "historic place")} whose climate threats are documented by published assessments or recent disasters; ${s.byClass.Critical + s.byClass.High} of them rate High or Critical.`,
    );
  } else {
    out.push(
      `${plural(s.threatened, "historic landmark")} of the ${s.analyzed.toLocaleString("en-US")} analyzed (${pct}%) face at least one elevated climate hazard by 2050.`,
    );
  }
  if (s.underwater > 0) {
    out.push(
      `${plural(s.underwater, "landmark")} could be underwater: they sit in FEMA flood zones, NOAA projected sea-level-rise zones, or high-risk coastal-flood communities.`,
    );
  }
  if (s.byHazard.slr > 0) {
    out.push(`${plural(s.byHazard.slr, "historic landmark")} lie${s.byHazard.slr === 1 ? "s" : ""} in projected sea-level-rise zones (+1 to +2 ft above today's high tide).`);
  }
  if (s.byHazard.flood > 0) {
    out.push(`${plural(s.byHazard.flood, "historic site")} ${s.byHazard.flood === 1 ? "is" : "are"} at risk from flooding (FEMA 100-year or coastal high-hazard zones, or repeated recorded floods).`);
  }
  if (s.burned > 0) {
    out.push(`${plural(s.burned, "landmark")} could burn: ${s.burned === 1 ? "it sits" : "they sit"} where wildfire would be hard to contain (high or very high hazard).`);
  }

  const leaders = s.byState.filter((r) => r.threatened > 0).slice(0, 2);
  if (leaders.length === 2) {
    out.push(
      `${stateName(leaders[0].state)} and ${stateName(leaders[1].state)} contain the highest concentration of threatened sites (${leaders[0].threatened} and ${leaders[1].threatened}).`,
    );
  } else if (leaders.length === 1 && s.byState.length > 1) {
    out.push(`${stateName(leaders[0].state)} contains the most threatened sites (${leaders[0].threatened}).`);
  }

  if (s.multiHazard > 0) {
    const both = s.waterAndFire > 0 ? `, and ${plural(s.waterAndFire, "location")} face${s.waterAndFire === 1 ? "s" : ""} both flooding and wildfire risk` : "";
    out.push(`${plural(s.multiHazard, "location")} face${s.multiHazard === 1 ? "s" : ""} two or more elevated hazards at once${both}.`);
  }

  const critical = s.byClass.Critical;
  if (critical > 0) {
    const names = ranked.filter((a) => a.riskClass === "Critical").slice(0, 3).map((a) => a.landmark.name);
    out.push(`${plural(critical, "landmark")} ${critical === 1 ? "is" : "are"} rated Critical, led by ${listJoin(names)}.`);
  }

  const top = ranked[0];
  if (top && top.threatened) {
    out.push(
      `The most vulnerable site analyzed is ${top.landmark.name} (${stateName(top.landmark.state)}), scoring ${Math.round(top.score)} of 100. ${top.reasons[0]}`,
    );
  }
  return out;
}

/**
 * Filters assessments to one state.
 * @param list All assessments.
 * @param stateAbbr Two-letter state code, or "" for all states.
 */
export function filterByState(list: RiskAssessment[], stateAbbr: string): RiskAssessment[] {
  return stateAbbr ? list.filter((a) => a.landmark.state === stateAbbr) : list;
}
