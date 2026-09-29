// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it } from "vitest";
import "@/i18n/config";
import { LiveFeedEventRow } from "./live-feed-event-row";
import { groupFeedItems } from "./live-feed-state";
import { feedKill } from "./live-feed-test-data";

type FeedItem = UserFeedResponseDtoOutput["items"][number];

const feedLoot = {
  id: "loot:42",
  groupKey: "loot:42",
  type: "loot",
  version: 1,
  occurredAt: "2026-09-06T12:00:03Z",
  world: "luvia",
  guild: { id: "organization", name: "Wspólnota", vanityUrl: "wspolnota" },
  npc: feedKill.npc,
  lootId: 42,
  additionalItemsCount: 0,
  items: [
    {
      id: 1,
      name: "Lśniące srebro północy",
      icon: "silver.gif",
      rarity: "UNIQUE",
      stat: "lvl=100;reqp=w",
      type: "ONE_HAND_WEAPON",
    },
    { id: 2, name: "Piękny miecz", icon: "sword.gif", rarity: "HEROIC" },
  ],
} satisfies FeedItem;

afterEach(cleanup);

async function renderRow(items: FeedItem[]) {
  const [group] = groupFeedItems(items);

  if (!group) throw new Error("Missing group");

  const root = createRootRoute({
    component: () => (
      <LiveFeedEventRow
        group={group}
        now={Date.parse("2026-09-06T14:00:00Z")}
      />
    ),
  });

  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  await router.load();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

it("shows a kill and its loot as one row that opens the loot", async () => {
  await renderRow([{ ...feedKill, count: 3, version: 3 }, feedLoot]);

  const link = await screen.findByRole("link", { name: "Łup: Heros" });
  expect(link.getAttribute("href")).toBe("/wspolnota?lootId=42");
  expect(screen.queryByRole("link", { name: "Bicie: Heros" })).toBeNull();
  expect(screen.getByText("×3")).toBeTruthy();
  expect(
    within(screen.getByRole("list", { name: "Przedmioty" })).getAllByRole(
      "listitem",
    ),
  ).toHaveLength(2);
  expect(screen.queryByText("Bez zapisanego łupu")).toBeNull();
});

it("links a kill without loot to the NPC statistics and says no loot was recorded", async () => {
  await renderRow([feedKill]);

  const link = await screen.findByRole("link", { name: "Bicie: Heros" });
  expect(link.getAttribute("href")).toBe("/organization/stats/npcs/1");
  expect(screen.getByText("Bez zapisanego łupu")).toBeTruthy();
});

it("keeps loot without an NPC reachable through a named link", async () => {
  await renderRow([
    { ...feedLoot, npc: null, guild: { ...feedLoot.guild, vanityUrl: null } },
  ]);

  const link = await screen.findByRole("link", { name: "Łup: Nowy łup" });
  expect(link.getAttribute("href")).toBe("/organization?lootId=42");
});

it("names items and Lootlogs for keyboard users through their tooltips", async () => {
  await renderRow([
    feedLoot,
    {
      ...feedLoot,
      id: "loot:42:second",
      guild: { id: "second", name: "Drugi Lootlog", vanityUrl: null },
    },
  ]);

  const item = await screen.findByRole("button", {
    name: "Lśniące srebro północy",
  });

  fireEvent.focus(item);
  expect(
    within(await screen.findByRole("tooltip")).getByText(/100/),
  ).toBeTruthy();
  fireEvent.blur(item);

  const lootlog = screen.getByRole("link", { name: "Drugi Lootlog" });
  expect(lootlog.getAttribute("href")).toBe("/second");
  fireEvent.focus(lootlog);
  expect(
    within(await screen.findByRole("tooltip")).getByText("Drugi Lootlog"),
  ).toBeTruthy();
});
