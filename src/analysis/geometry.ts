/**
 * ============================================================================
 * File:        src/analysis/geometry.ts
 * Purpose:     Small, dependency-free geometry helpers used by the analysis:
 *              point-in-polygon tests, bounding boxes, and haversine distance.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Heritage at Risk v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * "Spatial analysis" sounds fancy, but its most important operation is a
 * simple question: is this point inside that shape? We use it to decide
 * which state a landmark belongs to. The same idea — run on a server
 * with FEMA's flood polygons — tells us whether a landmark sits in a
 * flood zone. Seeing the algorithm here makes the server's answer less
 * of a black box.
 */

/** A ring is a closed list of [x, y] (= [lon, lat]) vertices, as in Esri JSON and GeoJSON. */
export type Ring = [number, number][];

/** A polygon as Esri JSON stores it: outer rings and holes mixed together. */
export interface EsriPolygon {
  rings: Ring[];
}

/** Axis-aligned bounding box in lon/lat degrees. */
export interface BBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

/**
 * Tests whether a point lies inside a single ring using the ray-casting
 * (even–odd) rule.
 *
 * LEARNING NOTE:
 * Imagine a ray shooting from the point to the right. Every time it crosses
 * the ring's edge it goes from outside→inside or inside→outside. An odd
 * number of crossings means the point is inside. It works for any simple
 * polygon, convex or not.
 *
 * @param x Point longitude.
 * @param y Point latitude.
 * @param ring Closed ring of [lon, lat] vertices.
 * @returns True when the point is inside the ring.
 */
export function pointInRing(x: number, y: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * Tests whether a point lies inside an Esri JSON polygon (with holes).
 *
 * LEARNING NOTE:
 * Esri polygons can contain several outer rings (e.g. Hawaii's islands) and
 * holes (e.g. a lake). Applying the even–odd rule across ALL rings handles
 * both cases at once: a point inside an island ring is "in"; a point inside
 * a hole is crossed twice and therefore "out".
 *
 * @param x Point longitude.
 * @param y Point latitude.
 * @param polygon Polygon with one or more rings.
 * @returns True when the point is inside the polygon.
 */
export function pointInPolygon(x: number, y: number, polygon: EsriPolygon): boolean {
  let inside = false;
  for (const ring of polygon.rings) {
    if (pointInRing(x, y, ring)) inside = !inside;
  }
  return inside;
}

/**
 * Computes the bounding box of a polygon.
 * @param polygon Polygon with one or more rings.
 * @returns The smallest box containing every vertex.
 */
export function polygonBBox(polygon: EsriPolygon): BBox {
  let xmin = Infinity;
  let ymin = Infinity;
  let xmax = -Infinity;
  let ymax = -Infinity;
  for (const ring of polygon.rings) {
    for (const [x, y] of ring) {
      if (x < xmin) xmin = x;
      if (y < ymin) ymin = y;
      if (x > xmax) xmax = x;
      if (y > ymax) ymax = y;
    }
  }
  return { xmin, ymin, xmax, ymax };
}

/**
 * Checks whether a point is inside a bounding box (cheap pre-filter before
 * the more expensive point-in-polygon test).
 */
export function bboxContains(b: BBox, x: number, y: number): boolean {
  return x >= b.xmin && x <= b.xmax && y >= b.ymin && y <= b.ymax;
}

/**
 * Great-circle distance between two lon/lat points (haversine formula).
 * @returns Distance in kilometers.
 */
export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Validates that a pair of numbers is a usable WGS84 coordinate.
 * NRHP data contains a few placeholder points at 0,0 — this filters them out.
 */
export function isValidLonLat(lon: unknown, lat: unknown): lon is number {
  return (
    typeof lon === "number" &&
    typeof lat === "number" &&
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    Math.abs(lon) <= 180 &&
    Math.abs(lat) <= 90 &&
    !(lon === 0 && lat === 0)
  );
}
