// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import type { UserFeedResponseDtoOutput } from "@lootlog/client/main";
import { afterEach, expect, it } from "vitest";
import "@/i18n/config";
import { LiveFeedRow } from "./live-feed-row";
import { feedKill } from "./live-feed-test-data";

type FeedItem = UserFeedResponseDtoOutput["items"][number];
const feedLoot = {
  id: "loot:42",
  type: "loot",
  version: 1,
  occurredAt: feedKill.occurredAt,
  world: "luvia",
  guild: { id: "organization", name: "Wspólnota", vanityUrl: "wspolnota" },
  npc: { ...feedKill.npc, name: "Breheret Żelazny Łeb" },
  lootId: 42,
  additionalItemsCount: 0,
  items: [
    {
      id: 1,
      name: "Lśniące srebro północy",
      icon: "silver.gif",
      rarity: "UNIQUE",
    },
    { id: 2, name: "Piękny miecz", icon: "sword.gif", rarity: "HEROIC" },
  ],
} satisfies FeedItem;

afterEach(cleanup);

async function renderRow(item: FeedItem) {
  const root = createRootRoute({
    component: () => (
      <ol>
        <LiveFeedRow item={item} now={Date.parse("2026-09-06T14:00:00Z")} />
      </ol>
    ),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  render(<RouterProvider router={router} />);
}

it("links a loot to its organization and preserves the loot search parameter", async () => {
  await renderRow(feedLoot);
  const link = await screen.findByRole("link", {
    name: "Nowy łup · Breheret Żelazny Łeb",
  });
  expect(link.getAttribute("href")).toBe("/wspolnota?lootId=42");
  expect(
    screen.getByRole("link", { name: "Wspólnota" }).getAttribute("href"),
  ).toBe("/wspolnota");
  expect(screen.getByText("Luvia")).toBeTruthy();
  expect(screen.getByText("2 godziny temu").getAttribute("datetime")).toBe(
    feedLoot.occurredAt,
  );
});

it("keeps loot without an NPC reachable through a single named icon link", async () => {
  await renderRow({
    ...feedLoot,
    npc: null,
    guild: { ...feedLoot.guild, vanityUrl: null },
  });
  const link = await screen.findByRole("link", { name: "Nowy łup" });
  expect(link.getAttribute("href")).toBe("/organization?lootId=42");
  expect(link.textContent).toBe("");
  expect(screen.getAllByRole("link", { name: "Nowy łup" })).toHaveLength(1);
  expect(screen.queryByText(feedLoot.npc.name)).toBeNull();
});

it("keeps loot item names available while hiding decorative sprites from assistive technology", async () => {
  await renderRow(feedLoot);
  const list = await screen.findByRole("list", { name: "Przedmioty" });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  for (const [index, item] of items.entries()) {
    expect(item.textContent).toBe(feedLoot.items[index]?.name);
    expect(within(item).queryAllByRole("img")).toHaveLength(0);
    expect(item.querySelector('[aria-hidden="true"]')).toBeTruthy();
  }
});

it("preserves the full NPC name and grouped count in a kill statistics link", async () => {
  const name =
    "Bardzo długie imię potwora wymagające zawinięcia na małym ekranie";
  await renderRow({ ...feedKill, count: 12, npc: { ...feedKill.npc, name } });
  const link = await screen.findByRole("link", { name: `Bicie: ${name}` });
  expect(link.getAttribute("href")).toBe("/organization/stats/npcs/1");
  expect(within(link).getByText(name)).toBeTruthy();
  expect(within(link).getByText("×12")).toBeTruthy();
  expect(screen.queryByRole("list", { name: "Przedmioty" })).toBeNull();
});
