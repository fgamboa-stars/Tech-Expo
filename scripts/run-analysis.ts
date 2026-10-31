/**
 * ============================================================================
 * File:        scripts/run-analysis.ts
 * Purpose:     Command-line batch analysis. Loads National Historic Landmarks
 *              (or every NRHP listing) from the National Park Service, tests
 *              each against all hazard layers, and writes
 *              public/data/analysis-results.json for the app to display.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial script (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * Usage:
 *   npm run analyze                      # all ~2,600 National Historic Landmarks (≈15–30 min)
 *   npm run analyze -- --state FL        # one state, merged into the existing results file
 *   npm run analyze -- --state LA --scope all --limit 500
 *   npm run analyze -- --concurrency 4 --out public/data/analysis-results.json
 *
 * LEARNING NOTE:
 * Why a script? Testing ~2,600 landmarks × 4 hazards is ~10,000 web requests.
 * That is fine for a computer to do once, but too slow to make every
 * visitor wait for. So we run it ahead of time and ship the answer as a
 * small JSON file — the same "pre-compute, then serve" pattern behind most
 * fast dashboards. The script imports the exact same engine the browser
 * uses, so results are identical.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { FEMA_FLOOD_URL, NRHP_POINTS_URL, NRI_TRACTS_URL, STATES_URL, WHP_URL, slrServiceUrl } from "../src/config/layers";
import { getState } from "../src/config/states";
import { assessLandmarks } from "../src/analysis/riskEngine";
import { loadLandmarksForState, loadNationalLandmarks, type LandmarkScope } from "../src/analysis/landmarkSource";
import { summarize } from "../src/analysis/findings";
import type { AnalysisResultsFile, RiskAssessment } from "../src/types/analysis";

/** Parsed command-line options. */
interface CliOptions {
  state?: string;
  scope: LandmarkScope;
  limit: number;
  concurrency: number;
  out: string;
}

/**
 * Reads `--flag value` pairs from process.argv.
 * @returns Options with defaults applied.
 */
function parseArgs(argv: string[]): CliOptions {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const state = get("--state")?.toUpperCase();
  if (state && !getState(state)) throw new Error(`Unknown state "${state}". Use a two-letter code like FL.`);
  const scope = (get("--scope") ?? "nhl") as LandmarkScope;
  if (scope !== "nhl" && scope !== "all") throw new Error('--scope must be "nhl" or "all"');
  return {
    state,
    scope,
    limit: Number(get("--limit") ?? 100_000),
    concurrency: Number(get("--concurrency") ?? 4),
    out: resolve(get("--out") ?? "public/data/analysis-results.json"),
  };
}

/** Draws a one-line text progress bar. */
function progressBar(done: number, total: number, startedAt: number): string {
  const width = 30;
  const filled = total ? Math.round((width * done) / total) : 0;
  const elapsed = (Date.now() - startedAt) / 1000;
  const eta = done ? Math.round((elapsed / done) * (total - done)) : 0;
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}] ${done}/${total}  ETA ${Math.floor(eta / 60)}m${eta % 60}s`;
}

/**
 * Reads an existing results file so a single-state run can be merged into it.
 * @returns Previous assessments, or an empty list.
 */
async function readExisting(path: string): Promise<RiskAssessment[]> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as AnalysisResultsFile;
    return parsed.assessments ?? [];
  } catch {
    return [];
  }
}

/** Entry point. */
async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const label = opts.state ? `${getState(opts.state)!.name}` : "the United States";
  console.log(`\nHeritage at Risk — analyzing ${opts.scope === "nhl" ? "National Historic Landmarks" : "all NRHP listings"} in ${label}\n`);

  // 1. Data acquisition: load landmark points.
  const landmarks = opts.state
    ? await loadLandmarksForState(opts.state, opts.scope, undefined, (n) => process.stdout.write(`\r  Loading landmarks… ${n}`))
    : await loadNationalLandmarks(opts.scope, undefined, (n) => process.stdout.write(`\r  Loading landmarks… ${n}`));
  const selected = landmarks.slice(0, opts.limit);
  console.log(`\n  ${landmarks.length} landmarks found; analyzing ${selected.length}.\n`);

  // 2–4. Spatial intersections + risk calculations.
  const startedAt = Date.now();
  const assessments = await assessLandmarks(selected, {
    concurrency: opts.concurrency,
    onProgress: (p) => process.stdout.write(`\r  ${progressBar(p.completed, p.total || selected.length, startedAt)}   `),
  });
  console.log("\n");

  // 5. Output generation: merge (for single-state runs) and write JSON.
  const previous = opts.state ? (await readExisting(opts.out)).filter((a) => a.landmark.state !== opts.state) : [];
  const all = [...previous, ...assessments].sort((a, b) => b.score - a.score);
  const file: AnalysisResultsFile = {
    meta: {
      generatedAt: new Date().toISOString(),
      scope: `${opts.scope === "nhl" ? "National Historic Landmarks" : "NRHP listings"}${opts.state ? ` (latest run: ${opts.state})` : " (national)"}`,
      landmarkCount: all.length,
      services: {
        landmarks: NRHP_POINTS_URL,
        states: STATES_URL,
        flood: FEMA_FLOOD_URL,
        coastal: NRI_TRACTS_URL,
        wildfire: WHP_URL,
        slr1ft: slrServiceUrl(1),
        slr2ft: slrServiceUrl(2),
      },
      notes: [
        "Severities: 0 none, 1 low, 2 elevated, 3 severe; null = service unavailable.",
        "Sea-level rise tested at +1 ft and +2 ft above MHHW (NOAA SLR Viewer).",
      ],
    },
    assessments: all,
  };
  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, JSON.stringify(file));

  const failed = all.filter((a) => a.incomplete).length;
  const summary = summarize(all);
  console.log(`  Wrote ${all.length} assessments to ${opts.out}`);
  if (failed) console.log(`  ⚠ ${failed} landmarks have at least one hazard that could not be assessed (service errors). Re-run later to fill gaps.`);
  console.log("\n  Findings:");
  for (const s of summary.statements) console.log(`   • ${s}`);
  console.log("");
}

main().catch((err) => {
  console.error(`\nAnalysis failed: ${(err as Error).message}`);
  process.exit(1);
});
