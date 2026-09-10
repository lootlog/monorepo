import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameEvent, W } from "@lootlog/margonem/game-events";
import type * as Transport from "@lootlog/client/transport";
import { getSettingsDocumentsControllerGetPreferencesQueryKey } from "@lootlog/client/main";
import { queryClient } from "@/lib/query-client";
import { getGroupFightSettingsParams } from "@/lib/group-fight-settings";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { GroupFightEventProcessor } from "./group-fight-event-processor";

const { post } = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue({ submittedGuilds: [], rejectedGuilds: [] }),
}));
vi.mock("@lootlog/client/transport", async (importOriginal) => ({
  ...(await importOriginal<typeof Transport>()),
  createApiClient: () => ({ post }),
}));
const warrior = (id: number, team: number): W[string] => ({
  id,
  originalId: id,
  name: `Player${id}`,
  team,
  lvl: 100,
  prof: "w",
  hpp: 100,
  icon: "",
  wt: 0,
  type: 0,
});
const start = 1788688590.123;
const setEnabled = (enabled: boolean) =>
  queryClient.setQueryData(
    getSettingsDocumentsControllerGetPreferencesQueryKey(
      getGroupFightSettingsParams(),
    ),
    { domains: { gameData: { effective: { groupFights: { enabled } } } } },
  );
const event = (f: NonNullable<GameEvent["f"]>, ev = start): GameEvent => ({
  f,
  ev,
});

describe("group fight capture", () => {
  beforeEach(() => {
    queryClient.clear();
    post.mockClear();
    useNpcsStore.getState().clearNpcs();
    useGameStore.getState().replaceGame({
      interface: "ni",
      world: "classic",
      map: { id: 1, name: "Sala Tronowa", pvp: 2, visibility: 1 },
      hero: {
        accountId: "10",
        characterId: "1",
        currentHp: 100,
        maxHp: 100,
        icon: "",
        level: 100,
        name: "Player1",
        profession: "w",
        x: 1,
        y: 1,
      },
    });
    setEnabled(true);
  });
  it("submits an independent PvP capture with late joins, flee and exact server times", async () => {
    const processor = new GroupFightEventProcessor();
    processor.handle(
      event({
        init: "1",
        w: { "1": warrior(1, 1), "2": warrior(2, 1), "3": warrior(3, 2) },
      }),
    );
    processor.handle(event({ w: { "4": warrior(4, 2) } }, start + 10));
    processor.handle(
      event({ endBattle: 1, m: ["0;0;winner=?", "3=100;0;flee"] }, start + 30),
    );
    await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
    expect(post).toHaveBeenCalledWith(
      "/group-fights",
      expect.objectContaining({
        map: { id: 1, name: "Sala Tronowa", pvp: 2 },
        startedAt: new Date(start * 1000).toISOString(),
        endedAt: new Date((start + 30) * 1000).toISOString(),
        winningTeam: null,
        myTeam: 1,
        participants: expect.arrayContaining([
          expect.objectContaining({ characterId: "1", accountId: "10" }),
          expect.objectContaining({
            characterId: "4",
            joinedAt: new Date((start + 10) * 1000).toISOString(),
          }),
          expect.objectContaining({ characterId: "3", fled: true }),
        ]),
      }),
    );
    processor.handle(event({ endBattle: 1 }, start + 30));
    expect(post).toHaveBeenCalledOnce();
  });
  it.each([false, undefined])(
    "does not collect without an enabled preference (%s)",
    (enabled) => {
      if (enabled === undefined) queryClient.clear();
      else setEnabled(enabled);
      const processor = new GroupFightEventProcessor();
      processor.handle(
        event({
          init: "1",
          w: {
            "1": warrior(1, 1),
            "2": warrior(2, 1),
            "3": warrior(3, 2),
            "4": warrior(4, 2),
          },
        }),
      );
      processor.handle(event({ endBattle: 1 }, start + 30));
      expect(post).not.toHaveBeenCalled();
    },
  );
  it.each([
    [2, 1],
    [10, 1],
    [1, 10],
    [8, 8],
    [10, 9],
  ])(
    "submits %sv%s for the organization's collection policy",
    async (teamOne, teamTwo) => {
      const processor = new GroupFightEventProcessor();
      const warriors = Object.fromEntries(
        Array.from({ length: teamOne + teamTwo }, (_, index) => [
          String(index + 1),
          warrior(index + 1, index < teamOne ? 1 : 2),
        ]),
      );
      processor.handle(event({ init: "1", w: warriors }));
      processor.handle(event({ endBattle: 1 }, start + 30));
      await vi.waitFor(() => expect(post).toHaveBeenCalledOnce());
      expect(post).toHaveBeenCalledWith(
        "/group-fights",
        expect.objectContaining({
          participants: expect.arrayContaining([
            expect.objectContaining({
              characterId: String(teamOne + teamTwo),
              team: 2,
            }),
          ]),
        }),
      );
    },
  );
  it("rejects PvE and 1v1 fights", () => {
    for (const warriors of [
      {
        "1": warrior(1, 1),
        "2": warrior(2, 1),
        "3": warrior(3, 2),
        "-4": warrior(-4, 2),
      },
      Object.fromEntries(
        Array.from({ length: 2 }, (_, index) => [
          String(index + 1),
          warrior(index + 1, index < 1 ? 1 : 2),
        ]),
      ),
    ]) {
      const processor = new GroupFightEventProcessor();
      processor.handle(event({ init: "1", w: warriors }));
      processor.handle(event({ endBattle: 1 }, start + 30));
    }
    expect(post).not.toHaveBeenCalled();
  });
  it("drops capture when the character changes or collection is disabled mid-fight", () => {
    const processor = new GroupFightEventProcessor();
    processor.handle(
      event({
        init: "1",
        w: {
          "1": warrior(1, 1),
          "2": warrior(2, 1),
          "3": warrior(3, 2),
          "4": warrior(4, 2),
        },
      }),
    );
    setEnabled(false);
    processor.handle(event({ endBattle: 1 }, start + 30));
    expect(post).not.toHaveBeenCalled();
  });
});
