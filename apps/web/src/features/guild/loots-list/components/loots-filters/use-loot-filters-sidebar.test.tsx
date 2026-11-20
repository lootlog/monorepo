// @vitest-environment happy-dom
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Storage as MemoryStorage } from "happy-dom";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { PropsWithChildren } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { useLootFiltersSidebar } from "./use-loot-filters-sidebar";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("recognizes a saved selection in a different order and toggles it off without offering a duplicate", async () => {
  vi.stubGlobal("localStorage", new MemoryStorage());

  const savedFilters = {
    npcLevelMin: "100",
    rarities: ["LEGENDARY", "HEROIC"],
  };

  localStorage.setItem(
    "loots-custom-quick-filters",
    JSON.stringify([
      { id: "custom-1", label: "High level drops", filters: savedFilters },
    ]),
  );
  const RouterWrapper = await createOrganizationTestWrapper();
  const client = new QueryClient();

  const wrapper = ({ children }: PropsWithChildren) => (
    <RouterWrapper>
      <QueryClientProvider client={client}>
        <NuqsTestingAdapter
          searchParams="?rarities=HEROIC,LEGENDARY&npcLevelMin=100&search=sword"
          hasMemory
        >
          {children}
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </RouterWrapper>
  );

  const { result, unmount } = renderHook(useLootFiltersSidebar, { wrapper });

  try {
    expect(result.current.isQuickFilterApplied(savedFilters)).toBe(true);
    expect(result.current.canSaveCurrentFilter).toBe(false);
    expect(
      result.current.isQuickFilterApplied({
        ...savedFilters,
        npcLevelMin: "101",
      }),
    ).toBe(false);
    expect(
      result.current.isQuickFilterApplied({
        ...savedFilters,
        rarities: ["LEGENDARY"],
      }),
    ).toBe(false);
    act(() => result.current.toggleQuickFilter(savedFilters));
    await waitFor(() => expect(result.current.filters.rarities).toEqual([]));
    expect(result.current.filters.npcLevelMin).toBe("");
    expect(result.current.filters.search).toBe("sword");
    expect(result.current.isQuickFilterApplied(savedFilters)).toBe(false);
    expect(
      JSON.parse(localStorage.getItem("loots-custom-quick-filters") ?? "[]")[0]
        .filters,
    ).toEqual(savedFilters);
  } finally {
    unmount();
    client.clear();
  }
});
