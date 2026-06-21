import { describe, expect, it } from "vitest";
import { getRecentOpponentBattleContext } from "./recent-opponent-battle-context";
import type { Battle } from "@/lib/api/battlelog-types";

const createBattle = (overrides: Partial<Battle> = {}): Battle =>
  ({
    id: "battle-1",
    characterId: "617",
    type: "1v1",
    world: "gordion",
    warriors: [
      {
        lvl: 300,
        originalId: "617",
        name: "Demodras",
        prof: "b",
      },
      {
        lvl: 300,
        originalId: "38798",
        name: "zpwrama",
        prof: "p",
      },
    ],
    ...overrides,
  }) as Battle;

describe("getRecentOpponentBattleContext", () => {
  it("returns the current character and 1v1 opponent", () => {
    expect(getRecentOpponentBattleContext(createBattle())).toEqual({
      battleId: "battle-1",
      characterId: "617",
      opponentId: "38798",
      opponentLvl: 300,
      opponentName: "zpwrama",
      opponentProf: "p",
      userLvl: 300,
      userName: "Demodras",
      userProf: "b",
      world: "gordion",
    });
  });

  it("ignores non-1v1 battles", () => {
    expect(
      getRecentOpponentBattleContext(createBattle({ type: "group" })),
    ).toBeNull();
  });

  it("ignores ambiguous warrior lists", () => {
    expect(
      getRecentOpponentBattleContext(
        createBattle({
          warriors: [
            {
              originalId: "617",
              name: "Demodras",
            },
          ] as Battle["warriors"],
        }),
      ),
    ).toBeNull();
  });
});
