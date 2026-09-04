// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getAllControllerSearchAllQueryKey } from "@lootlog/client/search";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LootSearchCommand } from "./loot-search-command";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/context/use-guild-context", () => ({
  useGuildContext: () => ({ world: "test-world" }),
}));
vi.mock("@/hooks/context/use-guild-id", () => ({
  useGuildId: () => "test-org",
}));
vi.mock("@/hooks/use-loots-filters", () => ({
  useLootsFilters: () => ({ setFilters: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LootSearchCommand search failures", () => {
  it.each([false, true])(
    "shows a service outage instead of no results (cached results: %s)",
    async (withCachedResults) => {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      });
      const restore = configureApiClients({
        search: { baseUrl: "https://search.test" },
      });
      const fetch = vi.fn(async () =>
        Response.json(
          { _tag: "SearchUnavailable", message: "Search unavailable" },
          { status: 503 },
        ),
      );
      vi.stubGlobal("fetch", fetch);
      if (withCachedResults) {
        client.setQueryData(
          getAllControllerSearchAllQueryKey({
            search: "smok",
            world: "test-world",
          }),
          {
            npcs: [],
            players: [],
            items: [
              {
                id: 1,
                name: "Nieaktualny wynik",
                icon: "",
                rarity: null,
                lvl: 1,
              },
            ],
          },
        );
      }
      try {
        render(
          <QueryClientProvider client={client}>
            <LootSearchCommand open onOpenChange={() => {}} />
          </QueryClientProvider>,
        );
        fireEvent.change(
          screen.getByPlaceholderText("loots.searchCommand.placeholder"),
          { target: { value: "smok" } },
        );
        await waitFor(
          () =>
            expect(screen.getByRole("alert").textContent).toContain(
              "common.searchUnavailable",
            ),
          { timeout: 3000 },
        );
        expect(fetch).toHaveBeenCalled();
        expect(screen.queryByText("loots.searchCommand.noResults")).toBeNull();
        expect(screen.queryByText("Nieaktualny wynik")).toBeNull();
      } finally {
        cleanup();
        client.clear();
        restore();
      }
    },
  );
});
