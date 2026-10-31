/**
 * ============================================================================
 * File:        src/analysis/__tests__/hazardProbes.test.ts
 * Purpose:     Tests the hazard probes and risk engine against a FAKE `fetch`
 *              that imitates the ArcGIS services, so the tests run offline.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial tests (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Real services can be slow or down, which makes tests flaky. Replacing
 * `globalThis.fetch` with a function that returns canned JSON ("mocking")
 * lets us check how our code interprets each service's answer — including
 * error answers — in milliseconds.
 */
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { probeFlood, probeSeaLevel, probeWildfire } from "../hazardProbes";
import { assessLandmark } from "../riskEngine";
import type { Landmark } from "../../types/landmark";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

/** Installs a fake fetch that routes by URL substring. */
function mockFetch(routes: [match: string, body: unknown][]): string[] {
  const calls: string[] = [];
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input instanceof Request ? input.url : input);
    calls.push(url);
    const hit = routes.find(([m]) => url.includes(m));
    return new Response(JSON.stringify(hit ? hit[1] : { features: [] }), { status: 200 });
  }) as typeof fetch;
  return calls;
}

const site: Landmark = { id: "x", name: "Test Fort", state: "GA", lon: -80.89, lat: 32.03, isNHL: true, source: "nrhp" };
const inland: Landmark = { id: "y", name: "Test Pueblo", state: "NM", lon: -106.27, lat: 35.78, isNHL: true, source: "nrhp" };

test("flood probe picks the most severe intersecting zone", async () => {
  mockFetch([["Flood_Hazard", { features: [{ attributes: { FLD_ZONE: "AE", SFHA_TF: "T" } }, { attributes: { FLD_ZONE: "VE", SFHA_TF: "T" } }] }]]);
  const e = await probeFlood(site);
  assert.equal(e.severity, 3);
  assert.match(e.label, /Zone VE/);
});

test("a service error becomes 'not assessed', never 'safe'", async () => {
  mockFetch([["Flood_Hazard", { error: { code: 500, message: "Boom" } }]]);
  const e = await probeFlood(site);
  assert.equal(e.severity, null);
  assert.match(e.label, /not assessed/);
});

test("wildfire probe reads the pixel class", async () => {
  mockFetch([["WildfireHazardPotential", { value: "5" }]]);
  assert.equal((await probeWildfire(inland)).severity, 3);
});

test("sea-level probe: wet at 2 ft and 1 ft is severe", async () => {
  mockFetch([["slr_", { results: [{ layerId: 0, layerName: "slr_2ft", attributes: { "Pixel Value": "0.4" } }] }]]);
  assert.equal((await probeSeaLevel(site)).severity, 3);
});

test("sea-level probe ignores NoData and low-lying layers", async () => {
  const calls = mockFetch([
    [
      "slr_2ft",
      {
        results: [
          { layerId: 0, layerName: "slr_2ft", attributes: { "Pixel Value": "NoData" } },
          { layerId: 1, layerName: "low_2ft", attributes: { "Pixel Value": "1" } },
        ],
      },
    ],
  ]);
  const e = await probeSeaLevel(site);
  assert.equal(e.severity, 0);
  assert.equal(calls.length, 1, "dry at +2 ft should skip the +1 ft request");
});

test("engine skips the sea-level test for inland states", async () => {
  const calls = mockFetch([
    ["National_Risk_Index", { features: [{ attributes: { CFLD_RISKR: "Not Applicable", RESL_RATNG: "Very Low", WFIR_RISKR: "Relatively High" } }] }],
    ["WildfireHazardPotential", { value: "5" }],
  ]);
  const a = await assessLandmark(inland);
  assert.ok(!calls.some((u) => u.includes("slr_")));
  assert.equal(a.exposures.find((e) => e.hazard === "wildfire")?.severity, 3);
  assert.equal(a.resilience?.rating, "Very Low");
  assert.equal(a.riskClass, "High");
});

test("engine runs the sea-level test for coastal tracts", async () => {
  const calls = mockFetch([
    ["National_Risk_Index", { features: [{ attributes: { CFLD_RISKR: "Very High" } }] }],
    ["Flood_Hazard", { features: [{ attributes: { FLD_ZONE: "AE", SFHA_TF: "T" } }] }],
    ["slr_", { results: [{ layerId: 0, layerName: "slr", attributes: { "Pixel Value": "0.2" } }] }],
    ["WildfireHazardPotential", { value: "6" }],
  ]);
  const a = await assessLandmark(site);
  assert.ok(calls.some((u) => u.includes("slr_2ft")));
  assert.equal(a.riskClass, "Critical");
  assert.equal(a.multiHazard, true);
});
