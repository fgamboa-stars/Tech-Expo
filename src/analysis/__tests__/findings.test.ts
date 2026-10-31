/**
 * ============================================================================
 * File:        src/analysis/__tests__/findings.test.ts
 * Purpose:     Tests for the findings aggregator and sentence generator,
 *              using the bundled reference dataset.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial tests (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { filterByState, plural, rankByVulnerability, summarize } from "../findings";
import { REFERENCE_ASSESSMENTS } from "../../data/referenceLandmarks";

test("reference dataset is scored and every site is in a known state", () => {
  assert.ok(REFERENCE_ASSESSMENTS.length >= 30);
  for (const a of REFERENCE_ASSESSMENTS) {
    assert.match(a.landmark.state, /^[A-Z]{2}$/);
    assert.ok(a.score >= 0 && a.score <= 100);
  }
});

test("reference ids are unique", () => {
  const ids = new Set(REFERENCE_ASSESSMENTS.map((a) => a.landmark.id));
  assert.equal(ids.size, REFERENCE_ASSESSMENTS.length);
});

test("summary counts are internally consistent", () => {
  const s = summarize(REFERENCE_ASSESSMENTS);
  const classTotal = Object.values(s.byClass).reduce((x, y) => x + y, 0);
  assert.equal(classTotal, s.analyzed);
  assert.equal(s.threatened, s.analyzed - s.byClass.Low);
  assert.equal(s.byState.reduce((x, r) => x + r.analyzed, 0), s.analyzed);
  assert.ok(s.top10.length <= 10);
  assert.ok(s.waterAndFire <= Math.min(s.underwater, s.burned));
});

test("statements answer the research question", () => {
  const s = summarize(REFERENCE_ASSESSMENTS);
  const text = s.statements.join(" ");
  assert.match(text, /underwater/);
  assert.match(text, /could burn/);
  assert.match(text, /highest concentration/);
});

test("empty input yields a helpful message, not zeros", () => {
  const s = summarize([]);
  assert.equal(s.analyzed, 0);
  assert.match(s.statements[0], /No landmarks have been analyzed/);
});

test("ranking is by score, descending", () => {
  const ranked = rankByVulnerability(REFERENCE_ASSESSMENTS);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].score >= ranked[i].score);
});

test("state filter keeps only that state", () => {
  const fl = filterByState(REFERENCE_ASSESSMENTS, "FL");
  assert.ok(fl.length > 0);
  assert.ok(fl.every((a) => a.landmark.state === "FL"));
  assert.equal(filterByState(REFERENCE_ASSESSMENTS, "").length, REFERENCE_ASSESSMENTS.length);
});

test("plural helper", () => {
  assert.equal(plural(1, "site"), "1 site");
  assert.equal(plural(1200, "site"), "1,200 sites");
});

test("reference mode never quotes a circular percentage", () => {
  const s = summarize(REFERENCE_ASSESSMENTS, "reference");
  assert.match(s.statements[0], /reference set/);
  assert.doesNotMatch(s.statements[0], /%/);
});
