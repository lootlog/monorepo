import { RESULTS_TABLE_MEDIA_QUERY } from "@/components/common/page-sticky-table-header";
import { vi } from "vitest";

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
