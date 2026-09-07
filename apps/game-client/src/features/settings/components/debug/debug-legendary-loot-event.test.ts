import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateLootOptions } from "@/api/loot.api";
import { EventDispatcher } from "@/lib/event-dispatcher";
import type { RuntimeGameSnapshot } from "@/lib/margonem-runtime/runtime.types";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import { createDebugLegendaryLootEvent } from "./debug-legendary-loot-event";

const { post } = vi.hoisted(() => ({
  post: vi.fn<(path: string, body: unknown) => Promise<unknown>>(),
}));

vi.mock("@lootlog/client/transport", () => ({
  createApiClient: () => ({ post }),
}));

const game = {
  hero: {
    accountId: "202",
    characterId: "101",
    currentHp: 500,
    maxHp: 1000,
    icon: "hero.gif",
    level: 230,
    name: "Current hero",
    profession: "w",
    x: 1,
    y: 2,
  },
  interface: "ni",
  map: { id: 1, name: "Ithan", visibility: 30 },
  world: "pandora",
} satisfies RuntimeGameSnapshot;

const lootRequests = () =>
  post.mock.calls.flatMap(([path, body]) =>
    path === "/loots" ? [body as CreateLootOptions] : [],
  );

describe("debug legendary loot event", () => {
  beforeEach(() => {
    post.mockReset();
    post.mockResolvedValue({
      id: 999,
      submittedGuilds: [],
      rejectedGuilds: [],
    });
    useBattleStore.getState().clearEvents();
    useBattleStore.setState({
      battleState: "idle",
      battleWarriors: {},
      lastBattleHash: "",
      lastKillHash: "",
    });
    useGameStore.getState().replaceGame(game);
    useNpcsStore.getState().clearNpcs();
    useOthersStore.getState().clearOthers();
    useOthersStore.getState().replaceOthers({
      "303": {
        accountId: "404",
        characterId: "303",
        name: "Outside the fight",
        profession: "m",
        icon: "other.gif",
        level: 123,
      },
    });
  });

  afterEach(async () => {
    await vi.waitFor(() =>
      expect(useBattleStore.getState().battleState).toBe("idle"),
    );
  });

  it("composes a legendary elite II request with the live map population", async () => {
    const dispatcher = new EventDispatcher();
    dispatcher.handleEvent(createDebugLegendaryLootEvent(game));

    await vi.waitFor(() => expect(lootRequests()).toHaveLength(1));
    expect(lootRequests()[0]).toMatchObject({
      world: "pandora",
      location: "Ithan",
      source: "FIGHT",
      accountId: "202",
      characterId: "101",
      players: [{ id: 101, accountId: 202, name: "Current hero", hpp: 50 }],
      loots: [
        {
          id: 62036,
          own: 101,
          name: "Szaty wyznawcy Hebrehotha",
          stat: expect.stringContaining("rarity=legendary"),
        },
      ],
      npcs: expect.arrayContaining([
        expect.objectContaining({ id: 308570, location: "Ithan" }),
        expect.objectContaining({ id: 308572, location: "Ithan" }),
        expect.objectContaining({
          id: 115103,
          wt: 21,
          type: 2,
          location: "Ithan",
        }),
      ]),
      mapPlayersSnapshot: [
        {
          accountId: 202,
          characterId: 101,
          name: "Current hero",
          prof: "WARRIOR",
          icon: "hero.gif",
        },
        {
          accountId: 404,
          characterId: 303,
          name: "Outside the fight",
          prof: "MAGE",
          icon: "other.gif",
        },
      ],
    });
  });

  it("submits a fresh loot on each click without deduplicating it", async () => {
    const dispatcher = new EventDispatcher();
    dispatcher.handleEvent(createDebugLegendaryLootEvent(game));
    dispatcher.handleEvent(createDebugLegendaryLootEvent(game));

    await vi.waitFor(() => expect(lootRequests()).toHaveLength(2));
    const [first, second] = lootRequests();
    expect(first?.loots[0]?.hid).toEqual(expect.any(String));
    expect(second?.loots[0]?.hid).toEqual(expect.any(String));
    expect(first?.loots[0]?.hid).not.toBe(second?.loots[0]?.hid);
  });

  it("still submits loot when the map population is not ready, omitting the snapshot", async () => {
    useOthersStore.getState().clearOthers();
    new EventDispatcher().handleEvent(createDebugLegendaryLootEvent(game));

    await vi.waitFor(() => expect(lootRequests()).toHaveLength(1));
    expect(lootRequests()[0]).not.toHaveProperty("mapPlayersSnapshot");
  });
});
