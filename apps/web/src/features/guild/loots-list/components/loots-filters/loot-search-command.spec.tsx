import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Storage as MemoryStorage } from "happy-dom";
import { GuildContextProvider } from "@/contexts/guild.context";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
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
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LootSearchCommand } from "./loot-search-command";

await initializeTestTranslations();
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LootSearchCommand search failures", () => {
  it.each([false, true])(
    "shows a service outage instead of no results (cached results: %s)",
    async (withCachedResults) => {
      const RouterWrapper = await createOrganizationTestWrapper("/test-org");
      const storage = new MemoryStorage();
      storage.setItem(
        "lootlog:guild:test-org:world",
        JSON.stringify("test-world"),
      );
      vi.stubGlobal("localStorage", storage);
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
      const previousSkipAnimations = MotionGlobalConfig.skipAnimations;
      try {
        MotionGlobalConfig.skipAnimations = true;
        render(
          <RouterWrapper>
            <NuqsTestingAdapter>
              <GuildContextProvider>
                <QueryClientProvider client={client}>
                  <LootSearchCommand open onOpenChange={() => {}} />
                </QueryClientProvider>
              </GuildContextProvider>
            </NuqsTestingAdapter>
          </RouterWrapper>,
        );
        fireEvent.change(
          screen.getByPlaceholderText("loots.searchCommand.placeholder"),
          { target: { value: "smok" } },
        );
        await waitFor(() =>
          expect(
            client.getQueryState(
              getAllControllerSearchAllQueryKey({
                search: "smok",
                world: "test-world",
              }),
            )?.status,
          ).toBe("error"),
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
        MotionGlobalConfig.skipAnimations = previousSkipAnimations;
      }
    },
  );
});
