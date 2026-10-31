# Heritage at Risk — Developer Guide

This guide explains how the application works internally and how to extend it. It assumes you have read the [README](README.md) and can run `npm run dev`. Every source file also carries a header comment and `LEARNING NOTE` comments that explain the "why" in place.

## Contents
1. [Application startup process](#1-application-startup-process)
2. [Architecture overview](#2-architecture-overview)
3. [Data flow explanation](#3-data-flow-explanation)
4. [ArcGIS integration walkthrough](#4-arcgis-integration-walkthrough)
5. [Layer loading process](#5-layer-loading-process)
6. [State filtering workflow](#6-state-filtering-workflow)
7. [Spatial analysis workflow](#7-spatial-analysis-workflow)
8. [Risk scoring methodology](#8-risk-scoring-methodology)
9. [Dashboard generation process](#9-dashboard-generation-process)
10. [Adding new hazard layers](#10-adding-new-hazard-layers)
11. [Creating new dashboard metrics](#11-creating-new-dashboard-metrics)
12. [Deployment guidance](#12-deployment-guidance)
- [Coding conventions](#coding-conventions)

---

## 1. Application startup process

1. **`index.html` loads.** An inline script reads `localStorage["har-theme"]` (or the OS preference) and sets `<html data-theme="light|dark">` before first paint, so there is no flash. The ArcGIS widget stylesheet `<link id="esri-theme">` and the Google Fonts (Bitter, Public Sans) load in parallel.
2. **`src/main.tsx` runs.** It imports `global.css` and `components.css` and renders `<App/>` inside `StrictMode`.
3. **`App.tsx` mounts providers:**
   - `ThemeProvider` keeps the theme, writes it to `<html>`, swaps the ArcGIS CSS URL, and saves it.
   - `AnalysisProvider` immediately exposes the bundled **reference set** (`src/data/referenceLandmarks.ts`), then fetches `data/analysis-results.json`. If that file exists and has assessments, it switches to **national GIS** mode.
4. **The router** (`useHashRoute`) reads `location.hash` and renders the page. `MapPage` and `StateExplorerPage` are `React.lazy` chunks — the ArcGIS SDK is downloaded only when a map is needed.
5. **When a map mounts**, `HeritageMap` creates the `Map`, `MapView`, layers and widgets once and keeps them in refs.

> In development, `StrictMode` mounts effects twice. `HeritageMap` destroys its view in the cleanup function, so the double mount is harmless.

## 2. Architecture overview

The code is split into layers that only depend "downward":

```
pages/            (screens; compose components, read context)
  └─ components/  (UI building blocks; no data fetching except HeritageMap's map layers)
       └─ context/  (AnalysisContext, ThemeContext — app state)
            └─ analysis/  (pure TypeScript engine: REST, geometry, scoring, findings)
                 └─ config/ + types/  (URLs, field names, constants, shared types)
```

Key principles:
- **`analysis/` never imports React or the ArcGIS SDK.** It talks to services with `fetch`, so it runs in the browser, in Node (`scripts/run-analysis.ts`), and in tests with a mocked `fetch`.
- **One source of truth for services:** `config/layers.ts`. The map and the engine read the same URLs.
- **One source of truth for data:** `AnalysisContext`. All pages read `assessments` and `summary` from it, so map, dashboard and story never disagree.
- **Evidence is typed:** every `HazardExposure` records `method` (`"gis"` or `"documented"`), `source`, and `severity: null` when not assessed.

## 3. Data flow explanation

```
                         ┌───────────────────────────────┐
  referenceLandmarks.ts ─┤                               │
                         │  AnalysisContext              │
 analysis-results.json ──┤   base: RiskAssessment[]      │──► assessments (merged) ──► summarize() ──► summary
  (npm run analyze)      │   live: Map<state, RA[]>      │          │                          │
                         │   runLiveAnalysis()  ─────────┼──► riskEngine.analyzeState()        │
                         └───────────────────────────────┘          │                          │
                                                                    ▼                          ▼
                                              HeritageMap (points), LandmarkList      Dashboard, Story, Findings
```

- **Merging:** `mergeAssessments()` lays live state results over the base dataset. A base landmark is dropped if a live landmark has the same id or lies within 0.5 km (haversine distance), so the same place is never counted twice; reference entries the live run did not cover are kept.
- **Summaries:** pages that filter (State Explorer, Dashboard state filter) call `summarize(filterByState(...))` locally; the global `summary` covers everything.
- **Dataset mode** changes wording only: in reference mode the headline sentence avoids percentages, because the reference set is a curated selection, not a census.

## 4. ArcGIS integration walkthrough

All SDK code lives in `src/components/map/`.

**`mapLayers.ts`** — pure factory functions:
- `createLandmarkLayer(assessments, theme)` converts each `RiskAssessment` into a `Graphic` (Point + attributes: `lmId`, `name`, `state`, `riskClass`, `score`, `hazards` as `|flood|slr|`) and builds a **client‑side `FeatureLayer`** with a `UniqueValueRenderer` on `riskClass` (bigger, darker circles for worse classes, ordered by score so critical points draw on top). The popup content is a function that renders the evidence table from the assessment.
- `createStatesLayer`, `createNrhpLayer`, `createHazardLayer(cfg)` build the service layers. The NRI layer gets a custom renderer so only meaningful coastal ratings are colored.

**`HeritageMap.tsx`** — the React bridge, organized as numbered effects:

| Effect | Responsibility |
|---|---|
| 1. mount | Create `Map` + `MapView`, add hazard/state/NRHP/selection layers, add `Home`, `Search`, `Expand(Legend)` widgets, register the click handler, report layer status. Cleanup calls `view.destroy()`. |
| 2. theme | Swap basemap (`gray-vector` ↔ `dark-gray-vector`) and rebuild the states layer outline color. |
| 3. landmarks | Replace the landmark layer when data or theme changes. |
| 4. visibility | Apply `layerVisibility` props to layers by id. |
| 5. filters | Set `layerView.filter = new FeatureFilter({ where })` for class/hazard filters — instant, no re‑query. |
| 6. selected state | Query the state polygon, draw an outline in a `GraphicsLayer`, `goTo` its extent (Alaska uses a preset view because it crosses the antimeridian). |
| 7. focus | Query a landmark by `lmId`, zoom to it, and `openPopup`. |

**Click handling:** `view.hitTest(event, { include: [landmarks, states] })`. A landmark hit wins; otherwise the state under the click is reported through `onStateClick`.

**API key:** `esriConfig.apiKey` is set at module load when `VITE_ARCGIS_API_KEY` exists.

## 5. Layer loading process

1. `HAZARD_LAYERS` (config) → `createHazardLayers(theme)` → layers added to the map **at the bottom** of the draw order, followed by state boundaries, NRHP context points, the analyzed landmark layer, and the selection outline on top.
2. For each service layer, `layer.when(onReady, onError)` reports `"ready"` or `"error"` to the page through `onLayerStatus`; `LayerPanel` shows "loading…" / "unavailable".
3. Visibility is driven by page state. Defaults come from `defaultVisible` in the config (wildfire on, others off) so the first view is not cluttered.
4. Scale limits: FEMA flood polygons only draw at 1:1,000,000 or closer (service setting); NRHP context points use `minScale: 2_500_000`; NRI tracts `minScale: 20_000_000`.

## 6. State filtering workflow

1. **Selection** comes from the URL (`#/explore/FL`) — `StateExplorerPage` validates it with `getState()`. The dropdown and map clicks call `navigate("/explore/XX")`, so Back/forward and bookmarks work.
2. **Filtering existing results:** `filterByState(assessments, "FL")` keeps assessments whose `landmark.state` is `"FL"`. Every landmark already carries a state, assigned once when loaded.
3. **Loading a state's landmarks** (`landmarkSource.loadLandmarksForState`):
   - `loadStateBoundaries()` downloads all state polygons once (cached promise) with `outSR=4326`, `maxAllowableOffset=0.01`.
   - The NRHP service is queried with the state's bounding box (+0.2° padding for offshore islands) and the scope's where‑clause, paging with `resultOffset`.
   - Each point is assigned with `assignState()` — bbox pre‑check, then `pointInPolygon()` — falling back to the nearest boundary vertex within ~2°. Only points assigned to the requested state are kept.
   - If the service rejects the `STATUS` filter (field renamed), the query retries with a simpler where‑clause.
4. **Map:** `selectedState` triggers effect 6 (outline + zoom).

## 7. Spatial analysis workflow

`riskEngine.assessLandmark(landmark)`:

```ts
const [nri, flood, wildfire] = await Promise.all([probeNri(l), probeFlood(l), probeWildfire(l)]);
const shouldTestSlr = floodZoneIsV || nri.coastalTract === true || (nri.coastalTract === null && stateIsCoastal);
const slr = shouldTestSlr ? await probeSeaLevel(l) : seaLevelNotApplicable(reason);
return buildAssessment(l, [flood, slr, wildfire, coastal], nri.resilience);
```

| Probe | REST call | Interpretation |
|---|---|---|
| `probeFlood` | `FeatureServer/0/query?geometry=x,y&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnGeometry=false` | Max severity of returned `FLD_ZONE`/`ZONE_SUBTY`/`SFHA_TF` |
| `probeNri` | same pattern on tracts | `CFLD_RISKR` → coastal severity; `RESL_RATNG` → resilience; `nriIndicatesCoastal` gates SLR |
| `probeWildfire` | `ImageServer/identify?geometry={x,y,sr}` | Pixel class 1–7 → severity |
| `probeSeaLevel` | `MapServer/identify?layers=all&tolerance=1&mapExtent=…` on +2 ft, then +1 ft | Inundated if any non‑"low‑lying" result has a non‑NoData pixel |

`assessLandmarks()` runs landmarks through `runPool()` (default `ANALYSIS_CONCURRENCY / 2` landmarks at a time, each issuing up to 4 requests) with progress callbacks and `AbortSignal` support. `fetchArcgisJson()` adds `f=json`, a 30 s timeout, auto‑POST for long requests, and converts Esri error bodies into `ServiceError`. Probes catch `ServiceError` and return `severity: null` ("not assessed"); cancellations are re‑thrown.

## 8. Risk scoring methodology

All in `riskScoring.ts`, covered by `__tests__/riskScoring.test.ts`.

**Severity scale:** 0 none · 1 low · 2 elevated · 3 severe · `null` not assessed.

| Hazard | 3 | 2 | 1 | 0 |
|---|---|---|---|---|
| Flood (`floodZoneSeverity`) | V, VE | SFHA: A, AE, AH, AO, AR, A99 | 0.2% / 500‑yr, levee‑protected | X minimal, D, none |
| SLR (`seaLevelSeverity`) | wet at +1 ft | wet at +2 ft only | — | dry |
| Wildfire (`wildfireSeverity`) | WHP 5 | WHP 4 | WHP 3 | 1, 2, 6, 7, NoData |
| Coastal (`nriRatingSeverity`) | Very High | Relatively High | Relatively Moderate | lower / N/A |

**Weights** (`HAZARD_WEIGHTS`): flood 1.0, slr 1.2 (permanent), wildfire 1.0, coastal 0.8 (neighborhood‑level, not site‑level).

**Score** (`computeRiskScore`):
```
base     = 100 × Σ(weight × severity) / Σ(weight × 3)
adjusted = base × resilienceFactor + 8 × max(0, elevatedCount − 1)
score    = min(100, adjusted)          // rounded to 0.1
```
`resilienceFactor` = 1.10 (NRI resilience "Very Low"), 1.05 ("Relatively Low"), else 1.0. Low resilience can only raise risk.

**Class** (`classifyRisk`) uses the score **and** the worst hazard, so one severe threat is never averaged away:
- Critical — score ≥ 55, or max severity 3 with ≥ 2 elevated hazards
- High — score ≥ 35, or max severity 3
- Moderate — score ≥ 15, or max severity ≥ 2
- Low — otherwise

**Worked examples:** wildfire 3 only → score 25 → *High*. Flood 2 + wildfire 2 → 33.3 + 8 = 41.3 → *High*. SLR 3 + flood 2 + coastal 3 → 66.7 + 16 = 82.7 → *Critical*.

To tune the model, change the constants (`HAZARD_WEIGHTS`, `MULTI_HAZARD_BONUS`, `CLASS_THRESHOLDS`) and run `npm test`. The About the Data page reads these constants, so documentation in the UI updates automatically.

## 9. Dashboard generation process

`findings.summarize(assessments, mode)` returns a `FindingsSummary`:

| Field | Meaning | Rendered as |
|---|---|---|
| `analyzed`, `threatened` | counts | stat tiles |
| `underwater`, `burned`, `waterAndFire` | water ≥ 2 / wildfire ≥ 2 / both | stat tiles, hero counts |
| `multiHazard` | ≥ 2 elevated hazards | stat tile |
| `byClass` | counts per class | `SegmentedBar` |
| `byHazard` | elevated count per hazard | `BarChart` with fixed hazard colors |
| `byState` | threatened/analyzed per state, sorted | `BarChart` (top 12), state dropdown counts |
| `top10` | ranked by score → elevated count → name | `LandmarkList` |
| `statements` | sentences from `generateStatements()` | `FindingsList` |

`DashboardPage` contains no math — it maps fields to components. Every chart is wrapped in `ChartFrame`, which provides the title and an accessible **Table** view.

## 10. Adding new hazard layers

Example: add **extreme heat**.

1. **Type:** add `"heat"` to `HazardId` and `HAZARD_IDS` in `src/types/hazard.ts`.
2. **Config:** add a `HazardLayerConfig` to `HAZARD_LAYERS` in `src/config/layers.ts` (URL, label, description, publisher, `mapLayerType`, `defaultVisible`, `opacity`), plus any field names in `FIELDS`.
3. **Severity mapping:** write `heatSeverity(value): SeverityResult` in `riskScoring.ts` and give it a weight in `HAZARD_WEIGHTS`.
4. **Probe:** write `probeHeat(landmark, signal)` in `hazardProbes.ts` using `queryFeaturesAtPoint` or `identifyImageValue`; return `unavailable("heat", err)` on `ServiceError`.
5. **Engine:** call it in `assessLandmark()` and include it in the `buildAssessment` list.
6. **Colors:** add `--hz-heat` to both themes in `global.css`, `.hazard-swatch--heat` / `.hazard-chip--heat` / `.hazard-card--heat` in `components.css`, and an entry in `HAZARD_COLORS` (`palette.ts`). Use the next slot of the validated categorical palette (magenta `#e87ba4` light / `#d55181` dark).
7. **Map:** `createHazardLayer` handles feature/imagery/map‑image automatically; add a custom renderer branch if needed.
8. **Findings:** decide whether heat counts toward "underwater", "burned", or a new statement in `generateStatements()`.
9. **Tests:** add mapping tests in `riskScoring.test.ts` and a mocked‑fetch probe test in `hazardProbes.test.ts`. Run `npm test` and `npm run typecheck`.

TypeScript will flag every `Record<HazardId, …>` you forgot to extend.

## 11. Creating new dashboard metrics

Example: **"National Historic Landmarks rated Critical"**.

1. Add the field to `FindingsSummary` in `src/types/analysis.ts`: `criticalNhl: number;`
2. Compute it in `summarize()`: `criticalNhl: assessments.filter(a => a.landmark.isNHL && a.riskClass === "Critical").length`.
3. Optionally add a sentence in `generateStatements()` (skip it when the count is 0).
4. Render it in `DashboardPage.tsx`: `<StatTile value={s.criticalNhl} label="NHLs rated Critical" tone="critical" />`, or a new `ChartFrame` + `BarChart` for a breakdown (always pass `table` rows).
5. Add a consistency test in `findings.test.ts`.

Because the State Explorer and Story also call `summarize()`, the metric is immediately available there too.

## 12. Deployment guidance

1. `npm ci && npm test && npm run typecheck`
2. *(Recommended)* `npm run analyze` to bake national results into `public/data/analysis-results.json`. Commit it if you want the deployed site to show GIS results without anyone running the script.
3. `npm run build` → `dist/` (static, relative paths, hash routes).
4. Host:
   - **GitHub Pages:** `npx gh-pages -d dist` then *Settings → Pages → Branch: gh-pages*. Or a GitHub Actions workflow running `npm ci && npm run build` and `actions/deploy-pages`.
   - **Netlify / Vercel / Cloudflare Pages:** build `npm run build`, output `dist`.
   - **Any web server / S3:** upload `dist/`.
5. Production checklist: set `VITE_ARCGIS_API_KEY` in the host's environment if you expect heavy traffic; verify each layer shows no "unavailable" flag; test `#/explore/FL` live analysis; check light and dark mode and a phone‑width window.
6. **Expo day:** run `npm run preview` on the demo laptop, open `#/` (Story) and `#/dashboard`; keep a state you have analyzed (e.g., Florida) ready in the State Explorer.

## Coding conventions

- Every file starts with the standard header (File, Purpose, Author placeholder, Created, Modification Notes). Add a dated line under **Modification Notes** when you change a file.
- Every exported function has JSDoc (`@param`, `@returns`).
- Use `LEARNING NOTE:` comments to explain *why* — GIS concepts, trade‑offs, and non‑obvious decisions.
- No raw hex colors in components: use CSS tokens (`var(--ink)`, `var(--hz-flood)`), or `palette.ts` for the map.
- Text never relies on color alone; every chart offers a table view.
- Keep `src/analysis` free of React and SDK imports.
