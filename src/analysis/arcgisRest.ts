/**
 * ============================================================================
 * File:        src/analysis/arcgisRest.ts
 * Purpose:     Thin, typed wrappers around the ArcGIS REST API operations the
 *              analysis needs (query, identify) plus a concurrency pool.
 *              Uses only `fetch`, so it runs in the browser and in Node 20+.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * The ArcGIS Maps SDK has its own query helpers (`layer.queryFeatures()`),
 * and the map uses them. For the analysis we call the REST endpoints directly
 * because (1) the same code then runs in Node for the national batch job and
 * (2) you can paste any URL this file builds into a browser and see the raw
 * JSON answer — a great way to learn how GIS web services work.
 */

/** Esri JSON feature as returned by `/query?f=json`. */
export interface EsriFeature<A = Record<string, unknown>> {
  attributes: A;
  geometry?: { x?: number; y?: number; rings?: [number, number][][] };
}

/** Subset of the `/query` response we use. */
export interface EsriQueryResponse<A = Record<string, unknown>> {
  features?: EsriFeature<A>[];
  exceededTransferLimit?: boolean;
  error?: { code: number; message: string; details?: string[] };
}

/** Error thrown when a service answers with an error or cannot be reached. */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Fetches JSON from an ArcGIS REST endpoint with a timeout, abort support,
 * and Esri-style error detection.
 *
 * LEARNING NOTE:
 * ArcGIS services often return HTTP 200 even when something went wrong,
 * putting the problem in an `error` property of the JSON body. Always check
 * for it — otherwise a failed query silently looks like "no features found",
 * which in our case would wrongly mean "no hazard"!
 *
 * @param url Endpoint URL (without query string when using POST).
 * @param params Request parameters; `f=json` is added automatically.
 * @param signal Optional AbortSignal to cancel the request.
 * @returns Parsed JSON body.
 */
export async function fetchArcgisJson<T>(
  url: string,
  params: Record<string, string | number | boolean>,
  signal?: AbortSignal,
): Promise<T> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, f: "json" })) search.set(k, String(v));
  const query = search.toString();

  // Long requests (e.g. polygon geometries) must be POSTed; short ones use GET
  // so responses can be cached by the browser and CDN.
  const usePost = url.length + query.length > 1800;
  const timeout = AbortSignal.timeout(DEFAULT_TIMEOUT_MS);
  const combined = signal ? anySignal([signal, timeout]) : timeout;

  let response: Response;
  try {
    response = usePost
      ? await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: query,
          signal: combined,
        })
      : await fetch(`${url}?${query}`, { signal: combined });
  } catch (err) {
    if (signal?.aborted) throw err; // user cancelled — let it propagate as-is
    throw new ServiceError(`Could not reach ${new URL(url).hostname}: ${(err as Error).message}`, url);
  }
  if (!response.ok) throw new ServiceError(`HTTP ${response.status} from ${new URL(url).hostname}`, url);

  const body = (await response.json()) as T & { error?: { code: number; message: string } };
  if (body && typeof body === "object" && "error" in body && body.error) {
    throw new ServiceError(`Service error ${body.error.code}: ${body.error.message}`, url);
  }
  return body;
}

/** Combines several AbortSignals into one that aborts when any of them does. */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (anyFn) return anyFn(signals);
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

/**
 * Asks a feature layer which features intersect a single point.
 *
 * LEARNING NOTE — this is the core "spatial intersection":
 * `spatialRel=esriSpatialRelIntersects` tells the server to return every
 * polygon that the point touches. If FEMA's flood layer returns a polygon
 * for a landmark's coordinates, that landmark is inside that flood zone.
 * `returnGeometry=false` keeps the response tiny: we need the polygon's
 * attributes (its zone code), not its shape.
 *
 * @param layerUrl Feature layer URL ending in /FeatureServer/N or /MapServer/N.
 * @param lon Point longitude (WGS84).
 * @param lat Point latitude (WGS84).
 * @param outFields Attribute fields to return.
 * @param signal Optional AbortSignal.
 * @returns Attributes of every intersecting feature (empty when none).
 */
export async function queryFeaturesAtPoint<A = Record<string, unknown>>(
  layerUrl: string,
  lon: number,
  lat: number,
  outFields: readonly string[],
  signal?: AbortSignal,
): Promise<A[]> {
  const res = await fetchArcgisJson<EsriQueryResponse<A>>(
    `${layerUrl}/query`,
    {
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: outFields.join(","),
      returnGeometry: false,
      where: "1=1",
    },
    signal,
  );
  return (res.features ?? []).map((f) => f.attributes);
}

/**
 * Pages through a query that may return more features than the service's
 * `maxRecordCount` (often 1,000–2,000).
 *
 * LEARNING NOTE:
 * Services cap how many features one response can hold. When a response has
 * `exceededTransferLimit: true` we ask again with `resultOffset` moved
 * forward — like turning pages in a book.
 *
 * @param layerUrl Feature layer URL.
 * @param params Query parameters (where, geometry, outFields, …).
 * @param pageSize Records per page.
 * @param signal Optional AbortSignal.
 * @param onPage Called after each page with the running total.
 * @returns Every feature that matched.
 */
export async function queryAllFeatures<A = Record<string, unknown>>(
  layerUrl: string,
  params: Record<string, string | number | boolean>,
  pageSize = 1000,
  signal?: AbortSignal,
  onPage?: (fetchedSoFar: number) => void,
): Promise<EsriFeature<A>[]> {
  const all: EsriFeature<A>[] = [];
  for (let offset = 0; offset < 200_000; offset += pageSize) {
    const res = await fetchArcgisJson<EsriQueryResponse<A>>(
      `${layerUrl}/query`,
      { ...params, resultOffset: offset, resultRecordCount: pageSize, orderByFields: params.orderByFields ?? "OBJECTID" },
      signal,
    );
    const page = res.features ?? [];
    all.push(...page);
    onPage?.(all.length);
    if (!res.exceededTransferLimit && page.length < pageSize) break;
    if (page.length === 0) break;
  }
  return all;
}

/** Response of ImageServer/identify. */
interface ImageIdentifyResponse {
  value?: string;
  name?: string;
}

/**
 * Reads the raster value under a point from an ImageServer.
 *
 * LEARNING NOTE:
 * Rasters are grids of cells (here 270 m × 270 m). "Identify" returns the
 * cell value at a location — for Wildfire Hazard Potential, a class from
 * 1 (very low) to 5 (very high), 6 (non-burnable) or 7 (water).
 *
 * @param imageServerUrl URL ending in /ImageServer.
 * @param lon Point longitude.
 * @param lat Point latitude.
 * @param signal Optional AbortSignal.
 * @returns The numeric pixel value, or null for NoData.
 */
export async function identifyImageValue(
  imageServerUrl: string,
  lon: number,
  lat: number,
  signal?: AbortSignal,
): Promise<number | null> {
  const res = await fetchArcgisJson<ImageIdentifyResponse>(
    `${imageServerUrl}/identify`,
    {
      geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
      geometryType: "esriGeometryPoint",
      returnGeometry: false,
      returnCatalogItems: false,
    },
    signal,
  );
  const first = (res.value ?? "").trim().split(/[\s,]+/)[0];
  const n = Number(first);
  return first && Number.isFinite(n) ? n : null;
}

/** One result of MapServer/identify. */
interface MapIdentifyResult {
  layerId: number;
  layerName: string;
  value?: string;
  attributes?: Record<string, string>;
}

/**
 * Asks a MapServer what lies under a point across all its layers.
 * Used for NOAA's sea-level-rise rasters, which are published as map services.
 *
 * @param mapServerUrl URL ending in /MapServer.
 * @param lon Point longitude.
 * @param lat Point latitude.
 * @param signal Optional AbortSignal.
 * @returns Identify results (empty when nothing is there).
 */
export async function identifyMapService(
  mapServerUrl: string,
  lon: number,
  lat: number,
  signal?: AbortSignal,
): Promise<MapIdentifyResult[]> {
  // identify needs a map extent and image size to convert the pixel
  // tolerance into ground distance; a ~1 km window at 400 px ≈ 2.5 m/px.
  const d = 0.005;
  const res = await fetchArcgisJson<{ results?: MapIdentifyResult[] }>(
    `${mapServerUrl}/identify`,
    {
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      sr: 4326,
      layers: "all",
      tolerance: 1,
      mapExtent: `${lon - d},${lat - d},${lon + d},${lat + d}`,
      imageDisplay: "400,400,96",
      returnGeometry: false,
    },
    signal,
  );
  return res.results ?? [];
}

/**
 * Runs async tasks with a maximum number in flight at once.
 *
 * LEARNING NOTE:
 * Firing 2,000 requests at once would overwhelm both the browser and the
 * public servers (and is impolite). A pool keeps N requests running; as
 * each finishes, the next starts. Six is the browser's per-host limit for
 * HTTP/1.1, so higher values rarely help.
 *
 * @param items Inputs to process.
 * @param limit Maximum concurrent tasks.
 * @param worker Async function applied to each item.
 * @param signal Optional AbortSignal; pending items are skipped once aborted.
 * @param onSettled Called after each item completes.
 * @returns Results in the same order as `items`.
 */
export async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
  onSettled?: (done: number, total: number) => void,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");
      const i = next++;
      results[i] = await worker(items[i], i);
      done++;
      onSettled?.(done, items.length);
    }
  });
  await Promise.all(lanes);
  return results;
}
