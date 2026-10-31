/**
 * ============================================================================
 * File:        src/hooks/useLostData.ts
 * Purpose:     React hooks for Lost America's asynchronous data: the
 *              historic photo for a place and the live count of properties
 *              removed from the National Register.
 * Author:      [Your Name]
 * Created:     2026-10-31
 * Modification Notes:
 *   - 2026-10-31  Initial hooks (Lost America v1.0)
 *   - [YYYY-MM-DD] [Describe your change here]
 * ============================================================================
 *
 * LEARNING NOTE:
 * Each hook starts a request in an effect and cancels it (AbortController)
 * if the component unmounts or the input changes before the answer arrives.
 * That prevents an old, slow response from overwriting a newer one.
 */
import { useEffect, useState } from "react";
import { fetchArchiveImage } from "../analysis/archiveImages";
import { countRemovedListings } from "../analysis/lostSource";
import type { ArchiveImage } from "../types/lost";

/** Loading state for an archive image. */
export type ImageState = { status: "none" } | { status: "loading" } | { status: "ready"; image: ArchiveImage } | { status: "missing" };

/**
 * Loads the historic photo for a Wikipedia title.
 * @param title Article title, or undefined when the place has none.
 * @returns The current loading state.
 */
export function useArchiveImage(title: string | undefined): ImageState {
  const [state, setState] = useState<ImageState>({ status: title ? "loading" : "none" });
  useEffect(() => {
    if (!title) {
      setState({ status: "none" });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchArchiveImage(title, controller.signal).then((image) => {
      if (!controller.signal.aborted) setState(image ? { status: "ready", image } : { status: "missing" });
    });
    return () => controller.abort();
  }, [title]);
  return state;
}

let removedCountPromise: Promise<number | null> | null = null;

/**
 * Loads (once per visit) the number of National Register listings marked Removed.
 * @returns The count, null while loading, or "unavailable".
 */
export function useRemovedCount(): number | null | "unavailable" {
  const [count, setCount] = useState<number | null | "unavailable">(null);
  useEffect(() => {
    let cancelled = false;
    removedCountPromise ??= countRemovedListings();
    removedCountPromise.then((n) => {
      if (n === null) removedCountPromise = null; // allow a retry on the next visit
      if (!cancelled) setCount(n ?? "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}
