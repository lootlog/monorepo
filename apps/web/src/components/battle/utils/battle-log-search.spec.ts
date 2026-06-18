import type {
  BattleWarrior,
  RawBattleParsedEvent,
} from "@/lib/api/battlelog-types";
import { describe, expect, it } from "vitest";
import {
  buildBattleLogRawSearchText,
  findBattleLogSearchMatches,
  getNextBattleLogSearchIndex,
  normalizeBattleLogSearchText,
} from "./battle-log-search";

const attacker = {
  originalId: "617",
  name: "Demodras",
  lvl: 306,
  prof: "b",
  icon: "/paid/her_atka_k.gif",
  team: 2,
} as BattleWarrior;

const defender = {
  originalId: "38798",
  name: "zpwrama",
  lvl: 309,
  prof: "w",
  icon: "/kuf/uni_xxxiv_ork_m2.gif",
  team: 1,
} as BattleWarrior;

describe("battle log search", () => {
  it("normalizes case and Polish diacritics", () => {
    expect(normalizeBattleLogSearchText("  Dotyk Anioła  ")).toBe(
      "dotyk aniola",
    );
    expect(normalizeBattleLogSearchText("ŻÓŁĆ Łódź")).toBe("zolc lodz");
  });

  it("matches visible log text", () => {
    const matches = findBattleLogSearchMatches({
      query: "dotyk aniola",
      entries: [
        {
          turn: 12,
          rawText: "",
          visibleText: "Dotyk anioła: zregenerowano 5359 punktów życia",
        },
      ],
    });

    expect(matches).toEqual([{ turn: 12 }]);
  });

  it("matches raw action keys and params", () => {
    const event: RawBattleParsedEvent = {
      attackerId: "617",
      defenderId: "38798",
      attackerHpPercentage: 90.76,
      defenderHpPercentage: 60.64,
      actions: [
        {
          actionType: "+legbon_holytouch",
          param: "",
        },
        {
          actionType: "legbon_holytouch_heal",
          param: "5359",
        },
      ],
    };
    const rawText = buildBattleLogRawSearchText({
      event,
      attacker,
      defender,
      turn: 18,
    });

    expect(
      findBattleLogSearchMatches({
        query: "legbon_holytouch",
        entries: [{ turn: 18, rawText }],
      }),
    ).toEqual([{ turn: 18 }]);
    expect(
      findBattleLogSearchMatches({
        query: "5359",
        entries: [{ turn: 18, rawText }],
      }),
    ).toEqual([{ turn: 18 }]);
  });

  it.each(["Kląt", "Klątwa", "klatwa"])(
    "matches curse action label for query %s",
    (query) => {
      const event: RawBattleParsedEvent = {
        attackerId: "617",
        defenderId: "38798",
        attackerHpPercentage: 90.76,
        defenderHpPercentage: 60.64,
        actions: [
          {
            actionType: "+legbon_curse",
            param: "",
          },
        ],
      };
      const rawText = buildBattleLogRawSearchText({
        event,
        attacker,
        defender,
        turn: 21,
      });

      expect(
        findBattleLogSearchMatches({
          query,
          entries: [{ turn: 21, rawText }],
        }),
      ).toEqual([{ turn: 21 }]);
    },
  );

  it.each(["Głę", "Głęboka", "Gleboka rana"])(
    "matches deep wound action labels for query %s",
    (query) => {
      const attackWoundEvent: RawBattleParsedEvent = {
        attackerId: "617",
        defenderId: "38798",
        attackerHpPercentage: 90.76,
        defenderHpPercentage: 60.64,
        actions: [
          {
            actionType: "+wound",
            param: "",
          },
        ],
      };
      const passiveWoundEvent: RawBattleParsedEvent = {
        attackerId: "38798",
        defenderId: null,
        attackerHpPercentage: 60.64,
        defenderHpPercentage: null,
        actions: [
          {
            actionType: "wound",
            param: "2595,30",
          },
        ],
      };

      expect(
        findBattleLogSearchMatches({
          query,
          entries: [
            {
              turn: 24,
              rawText: buildBattleLogRawSearchText({
                event: attackWoundEvent,
                attacker,
                defender,
                turn: 24,
              }),
            },
            {
              turn: 25,
              rawText: buildBattleLogRawSearchText({
                event: passiveWoundEvent,
                attacker: defender,
                turn: 25,
              }),
            },
          ],
        }),
      ).toEqual([{ turn: 24 }, { turn: 25 }]);
    },
  );

  it.each(["legbon_curse", "+legbon_curse", "wound"])(
    "keeps raw action key search working for query %s",
    (query) => {
      const event: RawBattleParsedEvent = {
        attackerId: "617",
        defenderId: "38798",
        attackerHpPercentage: 90.76,
        defenderHpPercentage: 60.64,
        actions: [
          {
            actionType: "+legbon_curse",
            param: "",
          },
          {
            actionType: "+wound",
            param: "",
          },
        ],
      };

      expect(
        findBattleLogSearchMatches({
          query,
          entries: [
            {
              turn: 27,
              rawText: buildBattleLogRawSearchText({
                event,
                attacker,
                defender,
                turn: 27,
              }),
            },
          ],
        }),
      ).toEqual([{ turn: 27 }]);
    },
  );

  it("deduplicates one log entry that matches raw and visible indexes", () => {
    const matches = findBattleLogSearchMatches({
      query: "Głęboka rana",
      entries: [
        {
          turn: 8,
          rawText: buildBattleLogRawSearchText({
            event: {
              attackerId: "617",
              defenderId: "38798",
              attackerHpPercentage: 90.76,
              defenderHpPercentage: 60.64,
              actions: [
                {
                  actionType: "+wound",
                  param: "",
                },
              ],
            },
            attacker,
            defender,
            turn: 8,
          }),
          visibleText: "Głęboka rana",
        },
      ],
    });

    expect(matches).toEqual([{ turn: 8 }]);
  });

  it("cycles previous and next search navigation", () => {
    expect(
      getNextBattleLogSearchIndex({
        currentIndex: -1,
        total: 3,
        direction: "next",
      }),
    ).toBe(0);
    expect(
      getNextBattleLogSearchIndex({
        currentIndex: 2,
        total: 3,
        direction: "next",
      }),
    ).toBe(0);
    expect(
      getNextBattleLogSearchIndex({
        currentIndex: 0,
        total: 3,
        direction: "previous",
      }),
    ).toBe(2);
    expect(
      getNextBattleLogSearchIndex({
        currentIndex: 0,
        total: 0,
        direction: "next",
      }),
    ).toBe(-1);
  });
});
