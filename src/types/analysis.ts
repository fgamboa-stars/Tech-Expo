/**
 * ============================================================================
 * File:        src/types/analysis.ts
 * Purpose:     Types for risk assessments, datasets and aggregated findings.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial types (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import type { HazardExposure, HazardId, ResilienceContext } from "./hazard";
import type { Landmark } from "./landmark";

/** The four risk classes, from least to most urgent. */
export type RiskClass = "Low" | "Moderate" | "High" | "Critical";

export const RISK_CLASSES: RiskClass[] = ["Low", "Moderate", "High", "Critical"];

/** The complete result of analyzing one landmark. */
export interface RiskAssessment {
  landmark: Landmark;
  /** One entry per hazard in HAZARD_IDS order. */
  exposures: HazardExposure[];
  resilience?: ResilienceContext;
  /** 0–100 composite risk score. */
  score: number;
  riskClass: RiskClass;
  /** True when riskClass is Moderate, High or Critical. */
  threatened: boolean;
  /** Hazards at severity ≥ 2 ("elevated" or "severe"). */
  significantHazards: HazardId[];
  /** True when two or more hazards are at severity ≥ 2. */
  multiHazard: boolean;
  /** True when at least one hazard could not be assessed. */
  incomplete: boolean;
  /** Plain-language reasons, shown as "Why is this threatened?". */
  reasons: string[];
  /** ISO timestamp of the analysis. */
  analyzedAt: string;
}

/** Which dataset the app is currently showing. */
export type DatasetMode =
  /** Curated, evidence-backed reference set bundled with the app. */
  | "reference"
  /** Pre-computed national GIS analysis produced by `npm run analyze`. */
  | "national-gis";

/** Shape of public/data/analysis-results.json written by scripts/run-analysis.ts. */
export interface AnalysisResultsFile {
  meta: {
    generatedAt: string;
    scope: string;
    landmarkCount: number;
    services: Record<string, string>;
    notes: string[];
  };
  assessments: RiskAssessment[];
}

/** Aggregated numbers that drive the dashboard, story and findings. */
export interface FindingsSummary {
  analyzed: number;
  threatened: number;
  byClass: Record<RiskClass, number>;
  /** Landmarks with severity ≥ 2 for each hazard. */
  byHazard: Record<HazardId, number>;
  /** Threatened landmarks per state, sorted descending. */
  byState: { state: string; threatened: number; analyzed: number }[];
  multiHazard: number;
  /** Severity ≥ 2 for some water hazard (flood, slr, coastal) AND wildfire. */
  waterAndFire: number;
  /** Severity ≥ 2 for any water hazard — "could be underwater". */
  underwater: number;
  /** Severity ≥ 2 for wildfire — "could be burned". */
  burned: number;
  top10: RiskAssessment[];
  /** Auto-generated plain-language findings. */
  statements: string[];
}

/** Progress information reported during a live analysis run. */
export interface AnalysisProgress {
  phase: "landmarks" | "hazards" | "done";
  completed: number;
  total: number;
  message: string;
}
