// @vitest-environment happy-dom

import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { Storage as MemoryStorage } from "happy-dom";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

await initializeTestTranslations();

afterEach(() => {
  vi.unstubAllGlobals();
});

it("recognizes a saved selection in a different order and toggles it off without losing the search", async () => {
  const RouterWrapper = await createOrganizationTestWrapper("/test-org");
  const storage = new MemoryStorage();
  vi.stubGlobal("localStorage", storage);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <RouterWrapper>
      <NuqsTestingAdapter searchParams="?search=smok" hasMemory>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </NuqsTestingAdapter>
    </RouterWrapper>
  );

  try {
    const { result } = renderHook(() => useLootFiltersSidebar(), { wrapper });
    act(() => {
      result.current.updateFilters({ rarities: ["LEGENDARY", "HEROIC"] });
      result.current.setNewFilterName("Rare drops");
    });
    await waitFor(() =>
      expect(result.current.filters.rarities).toEqual(["LEGENDARY", "HEROIC"]),
    );
    act(() => result.current.handleSaveFilter());

    const saved = result.current.allQuickFilters.find(
      (filter) => filter.label === "Rare drops",
    );

    if (!saved) throw new Error("The saved preset is missing");

    act(() => result.current.updateFilters({ rarities: ["HEROIC"] }));
    await waitFor(() => expect(result.current.canSaveCurrentFilter).toBe(true));
    expect(result.current.isQuickFilterApplied(saved.filters)).toBe(false);
    act(() =>
      result.current.updateFilters({ rarities: ["HEROIC", "LEGENDARY"] }),
    );
    await waitFor(() =>
      expect(result.current.filters.rarities).toEqual(["HEROIC", "LEGENDARY"]),
    );

    expect(result.current.isQuickFilterApplied(saved.filters)).toBe(true);
    expect(result.current.canSaveCurrentFilter).toBe(false);
    expect(saved.filters.rarities).toEqual(["LEGENDARY", "HEROIC"]);

    act(() => result.current.toggleQuickFilter(saved.filters));
    await waitFor(() => expect(result.current.filters.rarities).toEqual([]));
    expect(result.current.filters.search).toBe("smok");
  } finally {
    cleanup();
    client.clear();
  }
});
