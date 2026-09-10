import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
} from "@lootlog/client/main";
import { createUserPreferences } from "@/lib/testing/preferences";
import { z } from "zod";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  onTestFinished,
} from "vitest";
import { ServerVisibilitySettings } from "./server-visibility-settings";

let requests: Request[];

let client: QueryClient;

const renderSettings = () =>
  render(
    <QueryClientProvider client={client}>
      <ServerVisibilitySettings />
    </QueryClientProvider>,
  );

await initializeTestTranslations({
  "settings.servers.visibleCount": "{{count}} widoczne",
  "settings.servers.hiddenCount": "{{count}} ukryty",
  "settings.servers.switchLabel": "Pokaż {{name}} w grze",
  "settings.servers.title": "Widoczność serwerów",
  "settings.servers.description": "Opis",
  "settings.servers.searchPlaceholder": "Szukaj serwera",
  "settings.servers.filters.all": "Wszystkie",
  "settings.servers.filters.visible": "Widoczne",
  "settings.servers.filters.hidden": "Ukryte",
  "settings.servers.showAll": "Pokaż wszystkie",
  "settings.servers.hiddenInGameClient": "Ukryty w grze",
  "settings.servers.visibleInGameClient": "Widoczny w grze",
  "settings.servers.noResults": "Brak wyników",
});

describe("ServerVisibilitySettings", () => {
  afterEach(cleanup);

  beforeEach(() => {
    client = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity, retry: false } },
    });
    onTestFinished(() => client.clear());

    const guilds = ["Alpha", "Beta", "Gamma"].map((name, index) => ({
      id: `guild-${index + 1}`,
      name,
      icon: null,
    }));

    let preferences = createUserPreferences({
      guildsOrder: ["guild-2", "guild-1"],
      hiddenGuildIds: ["guild-2", "temporarily-unavailable"],
    });

    client.setQueryData(
      getUsersControllerGetCurrentUserGuildsQueryKey(),
      guilds,
    );
    client.setQueryData(
      getUsersControllerGetUserPreferencesQueryKey(),
      preferences,
    );
    requests = [];
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input, init) => {
            const request = new Request(input, init);

            if (request.method === "PATCH") {
              requests.push(request.clone());

              const update = z
                .object({ hiddenGuildIds: z.array(z.string()) })
                .parse(await request.json());

              preferences = { ...preferences, ...update };
            }

            return Response.json(preferences);
          },
        },
      }),
    );
  });

  it("renders ordered guilds and visibility counts", () => {
    renderSettings();

    expect(screen.getByText("2 widoczne · 1 ukryty")).toBeTruthy();
    expect(
      screen
        .getAllByRole("switch")
        .map((control) => control.getAttribute("aria-label")),
    ).toEqual([
      "Pokaż Beta w grze",
      "Pokaż Alpha w grze",
      "Pokaż Gamma w grze",
    ]);
  });

  it("filters, saves snapshots and preserves unavailable hidden IDs", async () => {
    renderSettings();

    fireEvent.click(screen.getByRole("button", { name: "Ukryte" }));
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alpha")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Wszystkie" }));
    fireEvent.change(screen.getByPlaceholderText("Szukaj serwera"), {
      target: { value: "alpha" },
    });
    fireEvent.click(screen.getByRole("switch", { name: "Pokaż Alpha w grze" }));
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(await requests[0]?.json()).toEqual({
      hiddenGuildIds: ["guild-2", "temporarily-unavailable", "guild-1"],
    });
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Pokaż wszystkie" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );

    fireEvent.click(screen.getByRole("button", { name: "Pokaż wszystkie" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await requests[1]?.json()).toEqual({
      hiddenGuildIds: ["temporarily-unavailable"],
    });
  });
});
