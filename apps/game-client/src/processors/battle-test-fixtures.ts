import { configureApiClients } from "@lootlog/client/transport";
import type { W } from "@lootlog/margonem/game-events";
import { onTestFinished } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

export const createBattleWarrior = (
  id: number,
  overrides: Partial<W[string]> = {},
): W[string] => ({
  id,
  originalId: id,
  name: id < 0 ? "Boss" : `Player ${id}`,
  lvl: 300,
  prof: "w",
  hpp: id < 0 ? 0 : 100,
  icon: "warrior.gif",
  team: id === 111 ? 1 : 2,
  wt: id < 0 ? 85 : 0,
  type: id < 0 ? 2 : 0,
  ...overrides,
});

export const createBattleTest = () => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.getState().clearEvents();
  useBattlePanelStore.setState({ isBattleCollectionEnabled: true });
  setTestRuntimeGame({
    hero: {
      accountId: "67890",
      characterId: "12345",
      name: "TestPlayer",
      level: 500,
      icon: "player.gif",
    },
  });
  const requests: Request[] = [];
  let status = 200;

  const fetch: typeof globalThis.fetch = (input, init) => {
    const request = new Request(input, init);
    requests.push(request);

    return Promise.resolve(
      Response.json(
        new URL(request.url).pathname === "/battles"
          ? { battleId: "battle-1" }
          : { updated: 1 },
        { status },
      ),
    );
  };

  const restore = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch },
    battlelog: { baseUrl: "https://battlelog.example.test", fetch },
  });

  onTestFinished(restore);

  return {
    requests,
    battles: () =>
      requests.filter(
        (request) => new URL(request.url).pathname === "/battles",
      ),
    kills: () =>
      requests.filter((request) => new URL(request.url).pathname === "/kills"),
    fail: () => {
      status = 400;
    },
  };
};
