import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { Storage as MemoryStorage } from "happy-dom";
import { GuildContextProvider } from "@/contexts/guild-provider";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getAllControllerSearchAllQueryKey } from "@lootlog/client/search";
import { MotionGlobalConfig } from "framer-motion";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LootSearchCommand } from "./loot-search-command";
import { useLootSearchCommand } from "./use-loot-search-command";
import { createLoot } from "@/lib/testing/loot";
import type { PropsWithChildren } from "react";

await initializeTestTranslations();

it("cancels obsolete HID lookups and can fetch again after unmounting", async () => {
  const RouterWrapper = await createOrganizationTestWrapper("/test-org");
  vi.stubGlobal("localStorage", new MemoryStorage());

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const requests: Array<{
    hid: string | null;
    resolve: (response: Response) => void;
  }> = [];

  const aborted: Array<string | null> = [];

  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: (input, options) => {
        const hid = new URL(String(input)).searchParams.get("hid");

        return new Promise<Response>((resolve, reject) => {
          requests.push({ hid, resolve });
          options?.signal?.addEventListener("abort", () => {
            aborted.push(hid);
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      },
    },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <RouterWrapper>
      <NuqsTestingAdapter>
        <GuildContextProvider>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </GuildContextProvider>
      </NuqsTestingAdapter>
    </RouterWrapper>
  );

  const mount = () =>
    renderHook(
      () => useLootSearchCommand({ open: true, onOpenChange: () => {} }),
      { wrapper },
    );

  const lootResponse = (hid: string) => {
    const loot = createLoot();

    return Response.json([
      { ...loot, items: loot.items.map((item) => ({ ...item, hid })) },
    ]);
  };

  try {
    const first = mount();
    act(() => first.result.current.setSearchQuery("ITEM#old.tempest"));
    await waitFor(() =>
      expect(requests.map(({ hid }) => hid)).toEqual(["old"]),
    );

    act(() => first.result.current.setSearchQuery("ITEM#current.tempest"));
    await waitFor(() => expect(aborted).toEqual(["old"]));
    await waitFor(() => expect(requests).toHaveLength(2));
    requests[1]?.resolve(lootResponse("current"));
    await waitFor(() =>
      expect(first.result.current.hidItem?.hid).toBe("current"),
    );
    act(() => first.result.current.setSearchQuery("ITEM#pending.tempest"));
    await waitFor(() => expect(requests).toHaveLength(3));
    first.unmount();
    await waitFor(() => expect(aborted).toEqual(["old", "pending"]));

    const second = mount();
    act(() => second.result.current.setSearchQuery("ITEM#pending.tempest"));
    await waitFor(() => expect(requests).toHaveLength(4));
    requests[3]?.resolve(lootResponse("pending"));
    await waitFor(() =>
      expect(second.result.current.hidItem?.hid).toBe("pending"),
    );
    expect(second.result.current.isHidError).toBe(false);
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});

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

describe("LootSearchCommand direct loot search", () => {
  const renderPalette = async (options: {
    searchParams?: string;
    onUrlUpdate?: (update: { searchParams: URLSearchParams }) => void;
  }) => {
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

    render(
      <RouterWrapper>
        <NuqsTestingAdapter
          searchParams={options.searchParams ?? ""}
          onUrlUpdate={options.onUrlUpdate}
        >
          <GuildContextProvider>
            <QueryClientProvider client={client}>
              <LootSearchCommand open onOpenChange={() => {}} />
            </QueryClientProvider>
          </GuildContextProvider>
        </NuqsTestingAdapter>
      </RouterWrapper>,
    );

    return client;
  };

  it("sends the typed term to the loot list instead of a resolved name", async () => {
    const updates: URLSearchParams[] = [];
    const previousSkipAnimations = MotionGlobalConfig.skipAnimations;
    let client: QueryClient | undefined;

    try {
      MotionGlobalConfig.skipAnimations = true;
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => Response.json({ npcs: [], players: [], items: [] })),
      );
      client = await renderPalette({
        onUrlUpdate: ({ searchParams }) => updates.push(searchParams),
      });

      fireEvent.change(
        screen.getByPlaceholderText("loots.searchCommand.placeholder"),
        { target: { value: "  Zbojca Gorski  " } },
      );

      const action = await screen.findByText(
        "loots.searchCommand.directSearch",
      );

      fireEvent.click(action);

      await waitFor(() => expect(updates.length).toBeGreaterThan(0));

      const applied = updates[updates.length - 1];

      expect(applied?.get("search")).toBe("Zbojca Gorski");
      expect(applied?.get("npcs")).toBeNull();
      expect(applied?.get("itemNames")).toBeNull();
    } finally {
      cleanup();
      client?.clear();
      MotionGlobalConfig.skipAnimations = previousSkipAnimations;
    }
  });

  it("shows an active term and clears it", async () => {
    const updates: URLSearchParams[] = [];
    const previousSkipAnimations = MotionGlobalConfig.skipAnimations;
    let client: QueryClient | undefined;

    try {
      MotionGlobalConfig.skipAnimations = true;
      client = await renderPalette({
        searchParams: "?search=Zbojca",
        onUrlUpdate: ({ searchParams }) => updates.push(searchParams),
      });

      expect(
        screen.getByText("loots.searchCommand.directSearchActive"),
      ).toBeTruthy();

      fireEvent.click(
        screen.getByText("loots.searchCommand.directSearchClear"),
      );

      await waitFor(() => expect(updates.length).toBeGreaterThan(0));
      expect(updates[updates.length - 1]?.get("search")).toBeNull();
    } finally {
      cleanup();
      client?.clear();
      MotionGlobalConfig.skipAnimations = previousSkipAnimations;
    }
  });
});
