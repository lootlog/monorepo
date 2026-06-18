import type { RawBattle } from "@/lib/api/battlelog-types";
import { describe, expect, it } from "vitest";
import {
  getDisplayBattleEvents,
  parseRawBattleSourceEvents,
} from "./raw-battle-events";

describe("parseRawBattleSourceEvents", () => {
  it("keeps decimal hp percentages from original source moves", () => {
    const events = parseRawBattleSourceEvents([
      {
        f: {
          m: ["38798=96.86;617=100.00;tspell=Okrzyk bojowy;skillId=271"],
        },
      },
    ]);

    expect(events?.[0]).toEqual({
      attackerId: "38798",
      defenderId: "617",
      attackerHpPercentage: 96.86,
      defenderHpPercentage: 100,
      actions: [
        { actionType: "tspell", param: "Okrzyk bojowy" },
        { actionType: "skillId", param: "271" },
      ],
    });
  });

  it("handles no-target rows and preserves comma action params", () => {
    const events = parseRawBattleSourceEvents([
      {
        f: {
          m: ["38798=96.86;0;wound=2595,30"],
        },
      },
    ]);

    expect(events?.[0]).toMatchObject({
      attackerId: "38798",
      defenderId: null,
      attackerHpPercentage: 96.86,
      defenderHpPercentage: null,
      actions: [{ actionType: "wound", param: "2595,30" }],
    });
  });
});

describe("getDisplayBattleEvents", () => {
  it("prefers source events over rounded parsed events", () => {
    const rawBattle: RawBattle = {
      accountId: "9822301",
      characterId: "617",
      world: "gordion",
      events: [
        {
          attackerId: "38798",
          defenderId: "617",
          attackerHpPercentage: 96,
          defenderHpPercentage: 100,
          actions: [{ actionType: "tspell", param: "Okrzyk bojowy" }],
        },
      ],
      sourceEvents: [
        {
          f: {
            m: ["38798=96.86;617=100.00;tspell=Okrzyk bojowy;skillId=271"],
          },
        },
      ],
    };

    expect(getDisplayBattleEvents(rawBattle)[0]).toMatchObject({
      attackerHpPercentage: 96.86,
      defenderHpPercentage: 100,
    });
  });

  it("falls back to parsed events when source events are unavailable", () => {
    const rawBattle: RawBattle = {
      accountId: "9822301",
      characterId: "617",
      world: "gordion",
      events: [
        {
          attackerId: "38798",
          defenderId: "617",
          attackerHpPercentage: 96,
          defenderHpPercentage: 100,
          actions: [{ actionType: "tspell", param: "Okrzyk bojowy" }],
        },
      ],
    };

    expect(getDisplayBattleEvents(rawBattle)).toBe(rawBattle.events);
  });
});
