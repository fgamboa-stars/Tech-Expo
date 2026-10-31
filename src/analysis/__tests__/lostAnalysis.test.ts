/**
 * ============================================================================
 * File:        src/analysis/__tests__/lostAnalysis.test.ts
 * Purpose:     Tests for Lost America filtering, dashboard calculations,
 *              narratives, image lookup and the live removal count.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial tests (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 */
import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { ALL_LOST_FILTERS, availableDecades, decadeOf, filterLostPlaces, narrativeFor, summarizeLost, yearsStood } from "../lostAnalysis";
import { fetchArchiveImage, resizeWikimediaThumb } from "../archiveImages";
import { countRemovedListings } from "../lostSource";
import { LOST_PLACES } from "../../data/lostPlaces";
import { getState } from "../../config/states";
import type { LostPlace } from "../../types/lost";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("curated lost places are valid and unique", () => {
  const ids = new Set<string>();
  for (const p of LOST_PLACES) {
    assert.ok(getState(p.state), `${p.name}: unknown state ${p.state}`);
    assert.ok(Math.abs(p.lon) <= 180 && Math.abs(p.lat) <= 90);
    assert.ok(!ids.has(p.id), `duplicate id ${p.id}`);
    ids.add(p.id);
    if (p.yearBuilt !== null && p.yearLost !== null) assert.ok(p.yearLost >= p.yearBuilt, `${p.name}: lost before built`);
    assert.ok(p.archive.label.length > 0);
  }
});

test("decades", () => {
  assert.equal(decadeOf(1967), 1960);
  assert.equal(decadeOf(2000), 2000);
  assert.equal(decadeOf(null), null);
});

test("no filters returns everything", () => {
  assert.equal(filterLostPlaces(LOST_PLACES, ALL_LOST_FILTERS).length, LOST_PLACES.length);
});

test("filters combine with AND", () => {
  const ny = filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, state: "NY" });
  assert.ok(ny.length > 0 && ny.every((p) => p.state === "NY"));
  const nySixties = filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, state: "NY", decade: 1960 });
  assert.ok(nySixties.every((p) => p.state === "NY" && decadeOf(p.yearLost) === 1960));
  assert.ok(nySixties.length < ny.length);
  const burned = filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, causes: ["burned"] });
  assert.ok(burned.length > 0 && burned.every((p) => p.cause === "burned"));
  assert.equal(filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, causes: [] }).length, 0);
});

test("text search matches name or city, case-insensitive", () => {
  assert.ok(filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, query: "ebbets" }).some((p) => p.id === "lost-ebbets-field"));
  assert.ok(filterLostPlaces(LOST_PLACES, { ...ALL_LOST_FILTERS, query: "lahaina" }).some((p) => p.id === "lost-wo-hing"));
});

test("available decades are sorted and distinct", () => {
  const d = availableDecades(LOST_PLACES);
  assert.deepEqual(d, [...new Set(d)].sort((a, b) => a - b));
});

test("summary counts are consistent", () => {
  const s = summarizeLost(LOST_PLACES);
  assert.equal(s.total, LOST_PLACES.length);
  assert.equal(s.byState.reduce((n, r) => n + r.count, 0), s.total);
  assert.equal(s.byDecade.reduce((n, r) => n + r.count, 0), s.total);
  assert.equal(s.byCause.reduce((n, r) => n + r.count, 0), s.total);
  for (let i = 1; i < s.byCause.length; i++) assert.ok(s.byCause[i - 1].count >= s.byCause[i].count);
  assert.ok(s.oldest && s.oldest.yearBuilt === Math.min(...LOST_PLACES.filter((p) => p.yearBuilt !== null).map((p) => p.yearBuilt!)));
  assert.ok(s.mostRecent && s.mostRecent.yearLost === Math.max(...LOST_PLACES.filter((p) => p.yearLost !== null).map((p) => p.yearLost!)));
  assert.ok(s.statements.length >= 3);
});

test("empty summary is friendly", () => {
  const s = summarizeLost([]);
  assert.equal(s.total, 0);
  assert.equal(s.medianYearsStood, null);
  assert.match(s.statements[0], /No lost places/);
});

test("narratives follow the template and never invent dates", () => {
  const sample: LostPlace = {
    id: "t", name: "Test Hall", city: "X", state: "NY", lon: 0, lat: 0, yearBuilt: 1887, yearLost: 1999,
    cause: "demolished", causeDetail: "Torn down.", significance: "", today: "Today only the site remains.", archive: { label: "a" },
  };
  assert.equal(narrativeFor(sample), "Built in 1887, Test Hall stood for over a century before being demolished in 1999. Today only the site remains.");
  assert.equal(yearsStood(sample), 112);
  const noDate = { ...sample, yearBuilt: null, builtLabel: "Ancient" };
  assert.equal(narrativeFor(noDate), "Ancient. Torn down. Today only the site remains.");
});

test("thumbnail resizing rewrites only the size segment", () => {
  assert.equal(
    resizeWikimediaThumb("https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Penn_Station.jpg/320px-Penn_Station.jpg", 640),
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Penn_Station.jpg/640px-Penn_Station.jpg",
  );
});

test("archive image: uses the lead image and skips disambiguation pages", async () => {
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = String(input);
    const body = url.includes("Ambiguous")
      ? { type: "disambiguation", thumbnail: { source: "x", width: 1, height: 1 } }
      : { type: "standard", title: "Test Place", thumbnail: { source: "https://u/thumb/a/320px-T.jpg", width: 320, height: 200 }, content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Test_Place" } } };
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof fetch;
  const img = await fetchArchiveImage("Test Place");
  assert.equal(img?.src, "https://u/thumb/a/640px-T.jpg");
  assert.equal(img?.pageUrl, "https://en.wikipedia.org/wiki/Test_Place");
  assert.equal(await fetchArchiveImage("Ambiguous"), null);
});

test("removed-listing count reads returnCountOnly and survives errors", async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ count: 1234 }), { status: 200 })) as typeof fetch;
  assert.equal(await countRemovedListings(), 1234);
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { code: 400, message: "bad" } }), { status: 200 })) as typeof fetch;
  assert.equal(await countRemovedListings(), null);
});
