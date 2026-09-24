// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { Storage as MemoryStorage } from "happy-dom";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { GuildContext } from "@/contexts/guild.context";
import { createTestGateway } from "@/lib/testing/gateway";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { LOOTS_VIEW_MODE_KEY } from "@/features/guild/loots-list/loots-list-layout";
import { LootsList } from "./loots-list";
import "@/i18n/config";

const lootWithStack = (id: number) => {
  const loot = createLoot(id);

  const items = [1, 2].map((itemId) => ({
    id: id * 10 + itemId,
    hid: `${id}-${itemId}`,
    name: `Loot ${id} item ${itemId}`,
    icon: "item.png",
    stat: "",
    type: null,
    rarity: "LEGENDARY" as const,
    lvl: 284,
    prof: [],
  }));

  return {
    ...loot,
    items,
    lootShare: { "player-1": items.map((item) => item.hid) },
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(480);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(800);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mountList(viewMode: string) {
  localStorage.setItem(LOOTS_VIEW_MODE_KEY, JSON.stringify(viewMode));
  const gateway = createTestGateway();
  const GatewayWrapper = gateway.wrapper;
  const LootWrapper = await createLootTestWrapper();
  let loots = [lootWithStack(1), lootWithStack(2)];

  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) =>
          String(input).includes("/loots?")
            ? Response.json(loots)
            : Response.json([{ id: "guild-1" }]),
      },
    }),
  );

  const renderApp = (world: string) => (
    <GatewayWrapper>
      <GuildContext value={{ world, setWorld: () => undefined }}>
        <LootWrapper>
          <LootsList />
        </LootWrapper>
      </GuildContext>
    </GatewayWrapper>
  );

  const view = render(renderApp("tempest"));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1);
  });

  return {
    refresh: async (nextLoots: ReturnType<typeof lootWithStack>[]) => {
      loots = nextLoots;
      await act(async () => {
        gateway.deliver({
          v: 1,
          type: "loot.created",
          data: { version: 2, guildId: "guild-1", lootId: 3, npcs: [] },
        });
        await vi.advanceTimersByTimeAsync(35_000);
      });
    },
    changeWorld: async () => {
      view.rerender(renderApp("katahha"));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
    },
  };
}

it.each([
  { viewMode: "list", insertedCount: 1 },
  { viewMode: "list", insertedCount: 2 },
  { viewMode: "grid", insertedCount: 1 },
  { viewMode: "grid", insertedCount: 2 },
])(
  "$viewMode reconciliation keeps the expanded loot when $insertedCount loots are inserted",
  async ({ viewMode, insertedCount }) => {
    const { refresh } = await mountList(viewMode);

    const originalStack = screen.getByRole("button", {
      name: "Loot 2 item 1",
      expanded: false,
    });

    fireEvent.click(originalStack);
    expect(originalStack.getAttribute("aria-expanded")).toBe("true");
    await refresh([
      lootWithStack(3),
      ...(insertedCount === 2 ? [lootWithStack(4)] : []),
      lootWithStack(1),
      lootWithStack(2),
    ]);

    expect(
      screen.getByRole("button", { name: "Loot 3 item 1", expanded: false }),
    ).toBeTruthy();

    const expandedStack = screen.getByRole("button", {
      name: "Loot 2 item 1",
      expanded: true,
    });

    fireEvent.click(expandedStack);
    expect(expandedStack.getAttribute("aria-expanded")).toBe("false");
  },
);

it("clears expansion when a loot leaves the loaded list or the query changes", async () => {
  const { refresh, changeWorld } = await mountList("grid");
  fireEvent.click(
    screen.getByRole("button", { name: "Loot 1 item 1", expanded: false }),
  );
  await refresh([lootWithStack(2)]);
  await refresh([lootWithStack(1), lootWithStack(2)]);

  const returnedStack = screen.getByRole("button", {
    name: "Loot 1 item 1",
    expanded: false,
  });

  fireEvent.click(returnedStack);
  expect(returnedStack.getAttribute("aria-expanded")).toBe("true");
  await changeWorld();
  expect(
    screen.getByRole("button", { name: "Loot 1 item 1", expanded: false }),
  ).toBeTruthy();
});
