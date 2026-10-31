/**
 * ============================================================================
 * File:        src/context/AnalysisContext.tsx
 * Purpose:     Holds the app's data: which assessments are shown (reference
 *              set or national GIS results), plus any states analyzed live
 *              in this session. Exposes the live-analysis action with
 *              progress and cancel support.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — data flow:
 *   startup ──► try public/data/analysis-results.json
 *                 ├─ found  → mode "national-gis" (GIS results for every NHL)
 *                 └─ missing → mode "reference"  (curated, documented set)
 *   State Explorer "Run live analysis" ──► riskEngine.analyzeState()
 *                 └─ results merged on top, replacing that state's base data
 *   Every page reads `assessments` and `summary` from this one context, so
 *   the map, dashboard and story always agree.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { NATIONAL_RESULTS_PATH } from "../config/appConfig";
import { REFERENCE_ASSESSMENTS } from "../data/referenceLandmarks";
import { analyzeState } from "../analysis/riskEngine";
import { summarize } from "../analysis/findings";
import { haversineKm } from "../analysis/geometry";
import type { LandmarkScope } from "../analysis/landmarkSource";
import type { AnalysisProgress, AnalysisResultsFile, DatasetMode, FindingsSummary, RiskAssessment } from "../types/analysis";

/** State of one live run. */
export interface LiveRun {
  state: string;
  scope: LandmarkScope;
  status: "running" | "done" | "error" | "cancelled";
  progress: AnalysisProgress;
  found?: number;
  skipped?: number;
  error?: string;
}

interface AnalysisValue {
  /** Base dataset mode. */
  mode: DatasetMode;
  /** Metadata of the national results file, when loaded. */
  nationalMeta?: AnalysisResultsFile["meta"];
  /** Still checking for the national results file. */
  loading: boolean;
  /** All assessments currently shown (base + live, de-duplicated). */
  assessments: RiskAssessment[];
  /** Summary of `assessments`. */
  summary: FindingsSummary;
  /** States analyzed live this session. */
  liveStates: string[];
  /** The current or most recent live run. */
  liveRun?: LiveRun;
  /** Starts a live analysis of one state. */
  runLiveAnalysis: (state: string, scope: LandmarkScope, maxLandmarks: number) => Promise<void>;
  /** Cancels the running live analysis. */
  cancelLiveAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisValue | null>(null);

/**
 * Merges live state results onto the base dataset.
 *
 * LEARNING NOTE:
 * A reference landmark and an NRHP record can describe the same place with
 * slightly different coordinates and names. We treat two points less than
 * 0.5 km apart as the same place and keep the GIS result, but we KEEP
 * reference entries that the live run did not cover (e.g. a site that is
 * NRHP-listed but not a National Historic Landmark).
 *
 * @param base Base assessments.
 * @param live Live assessments keyed by state.
 * @returns Combined list.
 */
export function mergeAssessments(base: RiskAssessment[], live: Map<string, RiskAssessment[]>): RiskAssessment[] {
  if (live.size === 0) return base;
  const out: RiskAssessment[] = [];
  for (const a of base) {
    const liveForState = live.get(a.landmark.state);
    if (!liveForState) {
      out.push(a);
      continue;
    }
    const sameId = liveForState.some((l) => l.landmark.id === a.landmark.id);
    const nearby = liveForState.some((l) => haversineKm(l.landmark.lon, l.landmark.lat, a.landmark.lon, a.landmark.lat) < 0.5);
    if (!sameId && !nearby) out.push(a);
  }
  for (const list of live.values()) out.push(...list);
  return out;
}

/**
 * Provides analysis data and actions to the app.
 * @param props.children The app.
 */
export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<DatasetMode>("reference");
  const [base, setBase] = useState<RiskAssessment[]>(REFERENCE_ASSESSMENTS);
  const [nationalMeta, setNationalMeta] = useState<AnalysisResultsFile["meta"]>();
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<Map<string, RiskAssessment[]>>(new Map());
  const [liveRun, setLiveRun] = useState<LiveRun>();
  const abortRef = useRef<AbortController | null>(null);

  // Startup: look for pre-computed national results (written by `npm run analyze`).
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}${NATIONAL_RESULTS_PATH}`, { cache: "no-cache" })
      .then((r) => (r.ok ? (r.json() as Promise<AnalysisResultsFile>) : null))
      .then((file) => {
        if (cancelled || !file?.assessments?.length) return;
        setBase(file.assessments);
        setNationalMeta(file.meta);
        setMode("national-gis");
      })
      .catch(() => {
        /* No results file (or not JSON): stay on the reference set. */
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const assessments = useMemo(() => mergeAssessments(base, live), [base, live]);
  const summary = useMemo(() => summarize(assessments, mode), [assessments, mode]);

  const runLiveAnalysis = useCallback(async (state: string, scope: LandmarkScope, maxLandmarks: number) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLiveRun({ state, scope, status: "running", progress: { phase: "landmarks", completed: 0, total: 0, message: "Starting…" } });
    try {
      const result = await analyzeState(state, scope, maxLandmarks, {
        signal: controller.signal,
        onProgress: (progress) => setLiveRun((r) => (r && r.state === state ? { ...r, progress } : r)),
      });
      setLive((prev) => new Map(prev).set(state, result.assessments));
      setLiveRun((r) => (r ? { ...r, status: "done", found: result.found, skipped: result.skipped } : r));
    } catch (err) {
      const aborted = controller.signal.aborted;
      setLiveRun((r) =>
        r ? { ...r, status: aborted ? "cancelled" : "error", error: aborted ? undefined : (err as Error).message } : r,
      );
    }
  }, []);

  const cancelLiveAnalysis = useCallback(() => abortRef.current?.abort(), []);

  const value = useMemo<AnalysisValue>(
    () => ({
      mode,
      nationalMeta,
      loading,
      assessments,
      summary,
      liveStates: [...live.keys()],
      liveRun,
      runLiveAnalysis,
      cancelLiveAnalysis,
    }),
    [mode, nationalMeta, loading, assessments, summary, live, liveRun, runLiveAnalysis, cancelLiveAnalysis],
  );

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

/** Hook to read analysis data and actions. */
export function useAnalysis(): AnalysisValue {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used inside <AnalysisProvider>");
  return ctx;
}
