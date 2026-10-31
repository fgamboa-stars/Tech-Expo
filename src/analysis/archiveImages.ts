/**
 * ============================================================================
 * File:        src/analysis/archiveImages.ts
 * Purpose:     Finds a historic photo for a lost place by asking Wikipedia's
 *              REST API for the lead image of the place's article. Results
 *              are cached so each image is requested only once.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial implementation (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE — image handling:
 * Copying photos into the app would mean checking and tracking each image's
 * license. Instead we ask Wikipedia at runtime for the article's lead image
 * (for a demolished building that is almost always a historic photograph,
 * often from the Library of Congress or another public archive). We always
 * show a credit that links to the image's page, where its date and license
 * are recorded. If there is no image, or the request fails, the UI shows the
 * archive link instead — a missing photo never breaks the page.
 */
import { WIKIPEDIA_SUMMARY_URL } from "../config/lostCauses";
import type { ArchiveImage } from "../types/lost";

/** Subset of the Wikipedia page-summary response we read. */
interface WikiSummary {
  type?: string;
  title?: string;
  thumbnail?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
}

const cache = new Map<string, Promise<ArchiveImage | null>>();

/**
 * Requests a larger thumbnail than the default 320 px by rewriting the size
 * segment of a Wikimedia thumbnail URL (".../320px-Name.jpg" → ".../640px-Name.jpg").
 * @param src Thumbnail URL.
 * @param width Desired width in pixels.
 */
export function resizeWikimediaThumb(src: string, width: number): string {
  return src.replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`);
}

/**
 * Fetches (once) the lead image of a Wikipedia article.
 *
 * @param title Exact English Wikipedia article title.
 * @param signal Optional AbortSignal.
 * @returns The image, or null when the article has none or cannot be reached.
 */
export function fetchArchiveImage(title: string, signal?: AbortSignal): Promise<ArchiveImage | null> {
  const cached = cache.get(title);
  if (cached) return cached;
  const url = WIKIPEDIA_SUMMARY_URL.replace("{title}", encodeURIComponent(title.replace(/ /g, "_")));
  const request = fetch(url, { signal, headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? (r.json() as Promise<WikiSummary>) : null))
    .then((s) => {
      // Disambiguation pages and articles without images give us nothing reliable.
      if (!s || s.type === "disambiguation" || !s.thumbnail?.source) return null;
      const pageUrl = s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      return {
        src: resizeWikimediaThumb(s.thumbnail.source, 640),
        pageUrl,
        credit: `Image: lead photo of the Wikipedia article “${s.title ?? title}” (see its page for date and license)`,
        width: s.thumbnail.width,
        height: s.thumbnail.height,
      };
    })
    .catch(() => {
      cache.delete(title); // allow a retry later (e.g. after reconnecting)
      return null;
    });
  cache.set(title, request);
  return request;
}
