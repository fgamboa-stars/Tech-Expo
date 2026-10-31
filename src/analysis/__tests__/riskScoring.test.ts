/**
 * ============================================================================
 * File:        src/analysis/__tests__/riskScoring.test.ts
 * Purpose:     Unit tests for severity mappings, the composite score and the
 *              risk classification rules.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial tests (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAssessment,
  classifyRisk,
  computeRiskScore,
  floodZoneSeverity,
  nriIndicatesCoastal,
  nriRatingSeverity,
  resilienceFromRating,
  seaLevelSeverity,
  wildfireSeverity,
} from "../riskScoring";
import type { HazardExposure, HazardId, Severity } from "../../types/hazard";
import type { Landmark } from "../../types/landmark";

/** Helper: builds exposures from a compact { hazard: severity } map. */
function ex(map: Partial<Record<HazardId, Severity | null>>): HazardExposure[] {
  return (["flood", "slr", "wildfire", "coastal"] as HazardId[]).map((hazard) => ({
    hazard,
    severity: hazard in map ? (map[hazard] as Severity | null) : 0,
    label: "test",
    detail: "test",
    method: "gis",
    source: "test",
  }));
}

const landmark: Landmark = { id: "t", name: "Test Site", state: "FL", lon: -80, lat: 25, isNHL: true, source: "nrhp" };

test("FEMA zones map to the right severities", () => {
  assert.equal(floodZoneSeverity("VE", null, "T").severity, 3);
  assert.equal(floodZoneSeverity("AE", null, "T").severity, 2);
  assert.equal(floodZoneSeverity("A", null, null).severity, 2);
  assert.equal(floodZoneSeverity("AO", null, null).severity, 2);
  assert.equal(floodZoneSeverity("X", "0.2 PCT ANNUAL CHANCE FLOOD HAZARD", "F").severity, 1);
  assert.equal(floodZoneSeverity("X", "AREA OF MINIMAL FLOOD HAZARD", "F").severity, 0);
  assert.equal(floodZoneSeverity(null, null, null).severity, 0);
});

test("sea-level rise: +1 ft wet is severe, +2 ft only is elevated", () => {
  assert.equal(seaLevelSeverity(true, true).severity, 3);
  assert.equal(seaLevelSeverity(false, true).severity, 2);
  assert.equal(seaLevelSeverity(false, false).severity, 0);
});

test("wildfire hazard potential classes", () => {
  assert.equal(wildfireSeverity(5).severity, 3);
  assert.equal(wildfireSeverity(4).severity, 2);
  assert.equal(wildfireSeverity(3).severity, 1);
  assert.equal(wildfireSeverity(2).severity, 0);
  assert.equal(wildfireSeverity(6).severity, 0); // non-burnable
  assert.equal(wildfireSeverity(null).severity, 0);
});

test("NRI ratings and coastal gating", () => {
  assert.equal(nriRatingSeverity("Very High").severity, 3);
  assert.equal(nriRatingSeverity("Relatively High").severity, 2);
  assert.equal(nriRatingSeverity("Relatively Moderate").severity, 1);
  assert.equal(nriRatingSeverity("Not Applicable").severity, 0);
  assert.equal(nriIndicatesCoastal("Not Applicable"), false);
  assert.equal(nriIndicatesCoastal("Very Low"), true);
  assert.equal(nriIndicatesCoastal(null), false);
});

test("resilience only ever raises risk", () => {
  assert.equal(resilienceFromRating("Very Low")?.factor, 1.1);
  assert.equal(resilienceFromRating("Relatively Low")?.factor, 1.05);
  assert.equal(resilienceFromRating("Very High")?.factor, 1);
  assert.equal(resilienceFromRating("Insufficient Data"), undefined);
});

test("no hazards scores 0 and classifies Low", () => {
  const e = ex({});
  assert.equal(computeRiskScore(e), 0);
  assert.equal(classifyRisk(0, e), "Low");
});

test("all hazards severe scores 100 (capped) and is Critical", () => {
  const e = ex({ flood: 3, slr: 3, wildfire: 3, coastal: 3 });
  assert.equal(computeRiskScore(e), 100);
  assert.equal(classifyRisk(100, e), "Critical");
});

test("a single severe hazard is never averaged below High", () => {
  const e = ex({ wildfire: 3 });
  const score = computeRiskScore(e);
  assert.equal(score, 25);
  assert.equal(classifyRisk(score, e), "High");
});

test("a single elevated hazard is Moderate", () => {
  const e = ex({ flood: 2 });
  assert.equal(classifyRisk(computeRiskScore(e), e), "Moderate");
});

test("compound threats get the multi-hazard bonus", () => {
  const one = computeRiskScore(ex({ flood: 2 }));
  const two = computeRiskScore(ex({ flood: 2, wildfire: 2 }));
  // two elevated hazards = double the weighted part + one 8-point bonus
  assert.ok(Math.abs(two - (2 * one + 8)) <= 0.2, `expected ≈ ${2 * one + 8}, got ${two}`);
});

test("severe + elevated is Critical even below the score threshold", () => {
  const e = ex({ wildfire: 3, flood: 2 });
  assert.equal(classifyRisk(computeRiskScore(e), e), "Critical");
});

test("low resilience multiplies the base score", () => {
  const e = ex({ flood: 2 });
  assert.ok(computeRiskScore(e, { rating: "Very Low", factor: 1.1 }) > computeRiskScore(e));
});

test("buildAssessment fills missing hazards and flags incomplete", () => {
  const a = buildAssessment(landmark, [
    { hazard: "flood", severity: 3, label: "Zone VE", detail: "", method: "gis", source: "FEMA" },
  ]);
  assert.equal(a.exposures.length, 4);
  assert.equal(a.incomplete, true);
  assert.equal(a.riskClass, "High");
  assert.equal(a.threatened, true);
  assert.deepEqual(a.significantHazards, ["flood"]);
  assert.match(a.reasons[0], /Severe: Zone VE/);
});

test("unassessed (null) hazards count as zero in the score", () => {
  assert.equal(computeRiskScore(ex({ flood: 2, slr: null })), computeRiskScore(ex({ flood: 2 })));
});
