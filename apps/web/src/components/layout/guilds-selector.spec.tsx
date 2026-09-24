// @vitest-environment happy-dom
import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react/pure";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  onTestFinished,
} from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type UserCurrentGuildResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { Toaster, toast } from "sonner";
import { z } from "zod";
import { createUserPreferences } from "@/lib/testing/preferences";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { createTestGateway } from "@/lib/testing/gateway";
import { GlobalContextProvider } from "@/contexts/global-provider";
import { ThemeContext } from "@/contexts/theme-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { GuildsSelector } from "./guilds-selector";

await initializeTestTranslations();

const guilds: UserCurrentGuildResponseDtoOutput[] = ["Alpha", "Beta"].map(
  (name, index) => ({
    id: `guild-${index + 1}`,
    name,
    icon: null,
    ownerId: "owner",
    publicStatsCardEnabled: false,
    hasLootlogAccess: true,
    isAccessDataStale: false,
  }),
);

const preferencesKey = getUsersControllerGetUserPreferencesQueryKey();

const guildsKey = getUsersControllerGetCurrentUserGuildsQueryKey();

let preferences: UserPreferencesResponseDtoOutput;

let serverGuilds: UserCurrentGuildResponseDtoOutput[];

let refreshedServerGuilds: boolean;

let requests: Request[];

let rejectReads: boolean;

let writeResponse: (() => Promise<Response>) | undefined;

let client: QueryClient;

beforeEach(() => {
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    toFake: ["setTimeout", "clearTimeout"],
  });
  preferences = createUserPreferences();
  serverGuilds = guilds;
  refreshedServerGuilds = false;
  requests = [];
  rejectReads = false;
  writeResponse = undefined;
  client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity, retry: false } },
  });
  onTestFinished(() => client.clear());
  client.setQueryData(guildsKey, guilds);
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: null,
    error: null,
  });
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const request = new Request(input, init);

          if (request.method === "PATCH") {
            requests.push(request.clone());

            if (writeResponse) return writeResponse();

            const update = z
              .object({
                hiddenGuildIds: z.array(z.string()).optional(),
                guildsOrder: z.array(z.string()).optional(),
              })
              .parse(await request.json());

            preferences = { ...preferences, ...update };

            return Response.json(preferences);
          }

          const url = new URL(request.url);

          if (url.searchParams.get("refresh") === "true") {
            refreshedServerGuilds = true;
          }

          if (rejectReads) return Response.json({}, { status: 503 });

          return Response.json(
            url.pathname.endsWith("/preferences") ? preferences : serverGuilds,
          );
        },
      },
    }),
  );
});

// Sonner can schedule multiple removal callbacks for one toast. Drain even those
// left after the toast disappears before unmounting and destroying the DOM.
afterEach(async () => {
  await waitFor(() => {
    if (client.isMutating() || client.isFetching())
      throw new Error("HTTP operations still pending");
  });
  await act(() => {
    toast.dismiss();
  });
  await waitFor(() => {
    if (document.querySelector("[data-sonner-toast]"))
      throw new Error("Toast exit animation still pending");
  });
  await act(() => vi.runOnlyPendingTimersAsync());
  cleanup();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function renderSelector() {
  client.setQueryData(preferencesKey, preferences);
  const RouterWrapper = await createOrganizationTestWrapper("/@me");
  const GatewayWrapper = createTestGateway().wrapper;

  return render(
    <RouterWrapper>
      <GatewayWrapper>
        <QueryClientProvider client={client}>
          <GlobalContextProvider>
            <ThemeContext.Provider
              value={{
                theme: "default",
                resolvedTheme: "default",
                setTheme: () => {},
                isLoading: false,
              }}
            >
              <GuildsSelector />
              <Toaster />
            </ThemeContext.Provider>
          </GlobalContextProvider>
        </QueryClientProvider>
      </GatewayWrapper>
    </RouterWrapper>,
  );
}

function guildLink(id: string) {
  const link = document.querySelector<HTMLAnchorElement>(`a[href="/${id}"]`);

  if (!link) throw new Error(`Missing organization ${id}`);

  return link;
}

async function toggleVisibility(id: string, hidden: boolean) {
  fireEvent.contextMenu(guildLink(id));
  fireEvent.click(
    await screen.findByRole("menuitem", {
      name: hidden
        ? "settings.servers.showInGameClient"
        : "settings.servers.hideInGameClient",
    }),
  );
  await waitFor(() => expect(requests).toHaveLength(1));
}

function dispatchPointer(
  target: HTMLElement | Window,
  type: "pointerdown" | "pointermove" | "pointerup",
  y: number,
) {
  const event = new PointerEvent(type, {
    bubbles: true,
    pointerId: 1,
    isPrimary: true,
    pointerType: "mouse",
    button: 0,
    buttons: type === "pointerup" ? 0 : 1,
    clientX: 20,
    clientY: y,
  });

  // happy-dom omits page coordinates consumed by the browser drag engine.
  Object.defineProperties(event, { pageX: { value: 20 }, pageY: { value: y } });
  fireEvent(target, event);
}

const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );

describe("GuildsSelector", () => {
  it("keeps cached guilds visible after a background refetch error", async () => {
    await renderSelector();
    rejectReads = true;
    await act(() =>
      Promise.all([
        client.refetchQueries({ queryKey: guildsKey }),
        client.refetchQueries({ queryKey: preferencesKey }),
      ]),
    );
    expect(client.getQueryState(guildsKey)?.status).toBe("error");
    expect(client.getQueryState(preferencesKey)?.status).toBe("error");
    expect(guildLink("guild-1").textContent).toContain("A");
    expect(guildLink("guild-2").textContent).toContain("B");
  });
  it("fetches a newly joined server when the list is refreshed", async () => {
    await renderSelector();
    serverGuilds = [...guilds, { ...guilds[0]!, id: "guild-3", name: "Gamma" }];
    fireEvent.click(
      screen.getByRole("button", { name: "ui.tooltips.refreshServers" }),
    );
    await waitFor(() =>
      expect(guildLink("guild-3").textContent).toContain("G"),
    );
    expect(refreshedServerGuilds).toBe(true);
  });
  it("reports a failed refresh and keeps the cached guilds", async () => {
    await renderSelector();
    rejectReads = true;
    fireEvent.click(
      screen.getByRole("button", { name: "ui.tooltips.refreshServers" }),
    );
    await screen.findByText("layout.guildsSelector.refreshError");
    expect(guildLink("guild-1").textContent).toContain("A");
  });
  it("does not retry a rejected guild order automatically", async () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const link = this.querySelector(
          'a[href="/guild-1"],a[href="/guild-2"]',
        );

        const top = link?.getAttribute("href") === "/guild-2" ? 60 : 0;

        return new DOMRect(0, top, 60, 50);
      },
    );
    let rejectWrite = (_error: Error) => {};

    writeResponse = () =>
      new Promise<Response>((_resolve, reject) => {
        rejectWrite = reject;
      });
    await renderSelector();
    await nextFrame();
    const item = guildLink("guild-1").closest("li");

    if (!item) throw new Error("Missing reorder item");
    dispatchPointer(item, "pointerdown", 20);
    dispatchPointer(window, "pointermove", 40);
    await nextFrame();
    dispatchPointer(window, "pointermove", 140);
    await nextFrame();
    dispatchPointer(window, "pointerup", 140);
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(await requests[0]?.json()).toEqual({
      guildsOrder: ["guild-2", "guild-1"],
    });
    await act(() => {
      rejectWrite(new Error("Rejected order"));
    });
    await waitFor(() => expect(client.isMutating()).toBe(0));
    await nextFrame();
    expect(requests).toHaveLength(1);
    expect(client.getQueryData(preferencesKey)).toMatchObject({
      guildsOrder: [],
    });
  });
  it("undoes only the visibility change represented by the toast", async () => {
    await renderSelector();
    await toggleVisibility("guild-1", false);

    const undo = await screen.findByRole("button", {
      name: "common.actions.undo",
    });

    await waitFor(() => {
      expect(client.isMutating()).toBe(0);
      expect(client.isFetching()).toBe(0);
    });
    preferences = { ...preferences, hiddenGuildIds: ["guild-1", "guild-2"] };
    await act(() => {
      client.setQueryData(preferencesKey, preferences);
    });
    await waitFor(() =>
      expect(
        guildLink("guild-2").querySelector(".lucide-eye-off"),
      ).not.toBeNull(),
    );
    fireEvent.click(undo);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await requests[1]?.json()).toEqual({ hiddenGuildIds: ["guild-2"] });
  });
  it("restores only the shown guild when undoing a show action", async () => {
    preferences = { ...preferences, hiddenGuildIds: ["guild-1"] };
    await renderSelector();
    await toggleVisibility("guild-1", true);

    const undo = await screen.findByRole("button", {
      name: "common.actions.undo",
    });

    await waitFor(() => {
      expect(client.isMutating()).toBe(0);
      expect(client.isFetching()).toBe(0);
    });
    preferences = { ...preferences, hiddenGuildIds: ["guild-2"] };
    await act(() => {
      client.setQueryData(preferencesKey, preferences);
    });
    await waitFor(() =>
      expect(
        guildLink("guild-2").querySelector(".lucide-eye-off"),
      ).not.toBeNull(),
    );
    fireEvent.click(undo);
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(await requests[1]?.json()).toEqual({
      hiddenGuildIds: ["guild-2", "guild-1"],
    });
  });
});
