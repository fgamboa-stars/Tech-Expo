/**
 * ============================================================================
 * File:        src/analysis/__tests__/geometry.test.ts
 * Purpose:     Unit tests for point-in-polygon and related geometry helpers.
 *              Run with `npm test`.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial tests (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Tests use Node's built-in test runner (`node:test`) through `tsx`, so no
 * extra testing library is needed. Each `test()` states one fact the code
 * must keep true; if a future change breaks it, `npm test` fails loudly.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, isValidLonLat, pointInPolygon, pointInRing, polygonBBox } from "../geometry";

const square: [number, number][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
];
const hole: [number, number][] = [
  [4, 4],
  [6, 4],
  [6, 6],
  [4, 6],
  [4, 4],
];

test("point inside a square ring is inside", () => {
  assert.equal(pointInRing(5, 5, square), true);
});

test("point outside a square ring is outside", () => {
  assert.equal(pointInRing(15, 5, square), false);
});

test("point inside a hole is outside the polygon", () => {
  assert.equal(pointInPolygon(5, 5, { rings: [square, hole] }), false);
  assert.equal(pointInPolygon(2, 2, { rings: [square, hole] }), true);
});

test("multi-part polygons (islands) are handled", () => {
  const island: [number, number][] = [
    [20, 20],
    [22, 20],
    [22, 22],
    [20, 22],
    [20, 20],
  ];
  assert.equal(pointInPolygon(21, 21, { rings: [square, island] }), true);
});

test("bbox covers every vertex", () => {
  assert.deepEqual(polygonBBox({ rings: [square] }), { xmin: 0, ymin: 0, xmax: 10, ymax: 10 });
});

test("haversine: Jamestown to Fort Monroe is about 45 km", () => {
  const d = haversineKm(-76.7775, 37.2093, -76.307, 37.0039);
  assert.ok(d > 40 && d < 50, `got ${d}`);
});

test("placeholder 0,0 coordinates are rejected", () => {
  assert.equal(isValidLonLat(0, 0), false);
  assert.equal(isValidLonLat(-90, 30), true);
  assert.equal(isValidLonLat(NaN, 30), false);
});
