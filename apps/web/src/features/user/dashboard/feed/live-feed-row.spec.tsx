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
import {
  getUsersControllerGetCurrentUserGuildsQueryKey,
  type UserFeedResponseDtoOutput,
} from "@lootlog/client/main";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
      stat: "lvl=100;reqp=w",
      type: "ONE_HAND_WEAPON",
    },
    { id: 2, name: "Piękny miecz", icon: "sword.gif", rarity: "HEROIC" },
  ],
} satisfies FeedItem;

afterEach(cleanup);

async function renderRow(item: FeedItem, organizations?: FeedItem["guild"][]) {
  const root = createRootRoute({
    component: () => (
      <ol>
        <li>
          <LiveFeedRow
            item={item}
            organizations={organizations}
            now={Date.parse("2026-09-06T14:00:00Z")}
          />
        </li>
      </ol>
    ),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  await router.load();
  const queryClient = new QueryClient();
  queryClient.setQueryData(getUsersControllerGetCurrentUserGuildsQueryKey(), [
    {
      id: "organization",
      icon: "https://cdn.discordapp.com/icons/organization/icon.png",
    },
  ]);
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
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

it("keeps item names in accessible tile labels and stat tooltips only", async () => {
  await renderRow(feedLoot);
  const list = await screen.findByRole("list", { name: "Przedmioty" });
  const items = within(list).getAllByRole("listitem");
  expect(items).toHaveLength(2);
  for (const [index, item] of items.entries()) {
    expect(item.textContent).toBe("");
    expect(within(item).queryAllByRole("img")).toHaveLength(0);
    expect(
      within(item).getByRole("button", { name: feedLoot.items[index]?.name }),
    ).toBeTruthy();
  }
  fireEvent.focus(
    within(list).getByRole("button", { name: "Lśniące srebro północy" }),
  );
  expect(await screen.findByRole("tooltip")).toBeTruthy();
  expect(within(screen.getByRole("tooltip")).getByText(/100/)).toBeTruthy();
});

it("renders an NPC sprite and all visible organizations below loot items", async () => {
  await renderRow({ ...feedLoot, npc: { ...feedLoot.npc, icon: "hero.gif" } }, [
    feedLoot.guild,
    { id: "second", name: "Druga organizacja", vanityUrl: null },
  ]);
  const image = await screen.findByRole("img", { name: feedLoot.npc.name });
  expect(image.getAttribute("src")).toContain("/npc/hero.gif");
  const organization = screen.getByRole("link", { name: "Druga organizacja" });
  expect(organization.getAttribute("href")).toBe("/second");
  expect(
    screen
      .getByRole("list", { name: "Przedmioty" })
      .compareDocumentPosition(organization) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

it("renders kill NPC sprites", async () => {
  await renderRow({ ...feedKill, npc: { ...feedKill.npc, icon: "hero.gif" } });
  expect(
    (await screen.findByRole("img", { name: feedKill.npc.name })).getAttribute(
      "src",
    ),
  ).toContain("/npc/hero.gif");
});

it("preserves the kill statistics link and displays grouped count in its footer", async () => {
  const name =
    "Bardzo długie imię potwora wymagające zawinięcia na małym ekranie";
  await renderRow({ ...feedKill, count: 12, npc: { ...feedKill.npc, name } });
  const link = await screen.findByRole("link", { name: `Bicie: ${name}` });
  expect(link.getAttribute("href")).toBe("/organization/stats/npcs/1");
  expect(within(link).getByText(name)).toBeTruthy();
  expect(screen.getByText("×12")).toBeTruthy();
  expect(within(link).queryByText("×12")).toBeNull();
  expect(screen.getByText("Pandora")).toBeTruthy();
  expect(screen.getByText("2 godziny temu").getAttribute("datetime")).toBe(
    feedKill.occurredAt,
  );
  expect(screen.queryByRole("list", { name: "Przedmioty" })).toBeNull();
});

it("renders compact loot tiles with organization avatars and no character sprites", async () => {
  await renderRow(
    {
      ...feedLoot,
      summary: {
        location: "Świątynia Andarum",
        npcs: [
          {
            id: 1,
            name: feedLoot.npc.name,
            wt: 100,
            lvl: 100,
            prof: null,
            icon: "breheret.gif",
            type: "HERO",
            margonemType: null,
          },
        ],
        players: [
          {
            id: "hero",
            name: "Gracz",
            lvl: 100,
            prof: null,
            icon: "hero.gif",
            accountId: null,
            characterId: null,
            hpp: null,
          },
        ],
        items: [
          {
            id: 1,
            hid: "silver",
            name: "Lśniące srebro północy",
            icon: "silver.gif",
            rarity: "UNIQUE",
            type: "ONE_HAND_WEAPON",
            stat: "lvl=100;reqp=w",
            lvl: 100,
            prof: [],
          },
          {
            id: 2,
            hid: "sword",
            name: "Piękny miecz",
            icon: "sword.gif",
            rarity: "HEROIC",
            type: null,
            stat: "",
            lvl: 100,
            prof: [],
          },
        ],
        lootShare: { hero: ["silver"] },
      },
    },
    [
      feedLoot.guild,
      { id: "second", name: "Druga organizacja", vanityUrl: null },
    ],
  );
  expect(await screen.findByText("Luvia · Świątynia Andarum")).toBeTruthy();
  expect(screen.getByText("Liczba graczy:").parentElement?.textContent).toBe(
    "Liczba graczy: 1",
  );
  expect(
    screen.getByText("Liczba przedmiotów:").parentElement?.textContent,
  ).toBe("Liczba przedmiotów: 2");
  expect(screen.getByText(/Breheret Żelazny Łeb/)).toBeTruthy();
  const npcImage = screen.getByRole("img", { name: feedLoot.npc.name });
  expect(npcImage.getAttribute("src")).toContain("/npc/breheret.gif");
  expect(
    npcImage.compareDocumentPosition(screen.getByText(/Breheret Żelazny Łeb/)) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();

  expect(
    screen
      .getByRole("link", { name: "Druga organizacja" })
      .getAttribute("href"),
  ).toBe("/second");
  expect(screen.queryByRole("button", { name: "Szczegóły" })).toBeNull();
  expect(document.querySelector('img[src*="hero.gif"]')).toBeNull();
  expect(
    within(screen.getByRole("list", { name: "Przedmioty" })).getAllByRole(
      "button",
    ),
  ).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Piękny miecz" })).toBeTruthy();
  expect(screen.queryByText("Lśniące srebro północy")).toBeNull();
  fireEvent.focus(
    screen.getByRole("button", { name: "Lśniące srebro północy" }),
  );
  expect(
    within(await screen.findByRole("tooltip")).getByText(/100/),
  ).toBeTruthy();
});

it("places all kill organizations in the header before world and time metadata", async () => {
  await renderRow(feedKill, [
    feedKill.guild,
    { id: "second", name: "Druga organizacja", vanityUrl: null },
  ]);
  const organization = await screen.findByRole("link", {
    name: "Druga organizacja",
  });
  expect(organization.getAttribute("href")).toBe("/second");
  expect(
    organization.compareDocumentPosition(screen.getByText("Pandora")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(screen.getByText("×1")).toBeTruthy();
});

it("shows organization avatar fallbacks and names on keyboard focus", async () => {
  await renderRow(feedKill, [
    feedKill.guild,
    { id: "second", name: "Druga organizacja", vanityUrl: null },
  ]);
  const link = await screen.findByRole("link", { name: "Druga organizacja" });
  expect(link.textContent).toBe("D");
  expect(screen.queryByText("Druga organizacja")).toBeNull();
  fireEvent.focus(link);
  expect(await screen.findByRole("tooltip")).toBeTruthy();
  expect(
    within(screen.getByRole("tooltip")).getByText("Druga organizacja"),
  ).toBeTruthy();
});

it("displays the kill NPC profession alongside its level", async () => {
  await renderRow({
    ...feedKill,
    npc: { ...feedKill.npc, lvl: 258, prof: "HUNTER" },
  });
  const link = await screen.findByRole("link", {
    name: `Bicie: ${feedKill.npc.name}`,
  });
  expect(link.textContent).toContain("(258h)");
});
