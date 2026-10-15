import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { vi } from "vitest";

/**
 * Renders results tables, which list tiles below `RESULTS_TABLE_MEDIA_QUERY`:
 * happy-dom's window is only 1024px wide. Undo it with `vi.unstubAllGlobals`.
 */
export const stubResultsTableViewport = () => {
  const nativeMatchMedia = window.matchMedia.bind(window);

  vi.stubGlobal("matchMedia", (query: string) => {
    const result = nativeMatchMedia(query);

    if (query === RESULTS_TABLE_MEDIA_QUERY) {
      Object.defineProperty(result, "matches", { value: true });
    }

    return result;
  });
};
