// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getTimersControllerGetTimersQueryKey,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { GuildContext } from "@/contexts/guild.context";
import { ThemeContext } from "@/contexts/theme-context";
import { queryClient } from "@/lib/query-client";
import { Timers } from "./timers";
import "@/i18n/config";

const timer: TimerResponseDto = {
  guildId: "one",
  world: "tempest",
  timerKey: "npc:1",
  npcId: 1,
  minSpawnTime: "2099-01-01T00:00:00.000Z",
  maxSpawnTime: "2099-01-01T01:00:00.000Z",
  updatedAt: "2026-09-18T00:00:00.000Z",
  wasReset: false,
  npc: {
    id: 1,
    name: "Original NPC",
    prof: "w",
    lvl: 100,
    type: "ELITE2",
    location: "Map",
    wt: "20",
    icon: null,
    margonemType: "npc",
  },
};

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount(fetchTimers: () => Promise<Response>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { ...queryClient.getDefaultOptions().queries, retry: false },
    },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) => {
          const url = new URL(String(input));

          if (url.pathname.endsWith("/timers")) return fetchTimers();

          return Response.json(["tempest", "pandora"]);
        },
      },
    }),
  );

  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/timers",
    component: Timers,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/one/timers"] }),
  });

  const tree = (world: string) => (
    <QueryClientProvider client={client}>
      <GuildContext value={{ world, setWorld: () => undefined }}>
        <ThemeContext
          value={{
            theme: "default",
            resolvedTheme: "default",
            isLoading: false,
            setTheme: () => undefined,
          }}
        >
          <RouterProvider router={router} />
        </ThemeContext>
      </GuildContext>
    </QueryClientProvider>
  );

  await router.load();
  const view = render(tree("tempest"));

  return {
    client,
    router,
    changeWorld: (world: string) => view.rerender(tree(world)),
  };
}

it.each(["world", "organization"])(
  "does not show previous %s timers while the new scope loads",
  async (scope) => {
    let resolvePending: (response: Response) => void = () => undefined;

    const pending = new Promise<Response>((resolve) => {
      resolvePending = resolve;
    });

    const fetchTimers = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(Response.json([timer]))
      .mockReturnValueOnce(pending);

    const { router, changeWorld } = await mount(fetchTimers);
    await screen.findByText("Original NPC");

    await act(async () => {
      if (scope === "world") changeWorld("pandora");
      else
        await router.navigate({
          to: "/$guildId/timers",
          params: { guildId: "two" },
        });
    });
    await waitFor(() => expect(fetchTimers).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Original NPC")).toBeNull();

    await act(async () => {
      resolvePending(
        Response.json([{ ...timer, npc: { ...timer.npc, name: "New NPC" } }]),
      );
    });
    await screen.findByText("New NPC");
  },
);

it("recovers from initial and background failures without losing the last loaded timers", async () => {
  const fetchTimers = vi
    .fn<() => Promise<Response>>()
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(Response.json([timer]))
    .mockResolvedValueOnce(new Response(null, { status: 503 }))
    .mockResolvedValueOnce(
      Response.json([{ ...timer, npc: { ...timer.npc, name: "Updated NPC" } }]),
    );

  const { client } = await mount(fetchTimers);
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
  await screen.findByText("Original NPC");
  expect(screen.queryByRole("alert")).toBeNull();

  await act(async () => {
    await client.invalidateQueries({
      queryKey: getTimersControllerGetTimersQueryKey(
        { guildId: "one" },
        { world: "tempest" },
      ),
    });
  });
  await screen.findByRole("alert");
  expect(screen.getByText("Original NPC")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Spróbuj ponownie" }));
  await screen.findByText("Updated NPC");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByText("Original NPC")).toBeNull();
});

it("orders timer groups by NPC type, then spawn time, preserving tied timers", async () => {
  const timers: TimerResponseDto[] = [
    {
      ...timer,
      timerKey: "late",
      npc: { ...timer.npc, id: 10, name: "Late NPC" },
      maxSpawnTime: "2099-01-01T03:00:00.000Z",
    },
    {
      ...timer,
      timerKey: "first",
      npc: { ...timer.npc, id: 11, name: "First tied NPC" },
    },
    {
      ...timer,
      timerKey: "titan",
      npc: { ...timer.npc, id: 12, name: "Titan NPC", type: "TITAN" },
      maxSpawnTime: "2099-01-01T04:00:00.000Z",
    },
    {
      ...timer,
      timerKey: "second",
      npc: { ...timer.npc, id: 13, name: "Second tied NPC" },
    },
  ];

  await mount(async () => Response.json(timers));
  await screen.findByText("Titan NPC");
  expect(
    screen
      .getAllByText(/^(Late|First tied|Titan|Second tied) NPC$/)
      .map((element) => element.textContent),
  ).toEqual(["Titan NPC", "First tied NPC", "Second tied NPC", "Late NPC"]);
});
