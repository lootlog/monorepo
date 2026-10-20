import type { FactionWarResponseDto } from "@lootlog/client/main";
import { describe, expect, it } from "vitest";
import {
  dismissFactionWarPick,
  getFactionUnderdogBonus,
  shouldAutoOpenFactionWarPick,
} from "./faction-war-pick-state";

const war = (
  overrides: Partial<Pick<FactionWarResponseDto, "status" | "pick">> = {},
): Pick<FactionWarResponseDto, "id" | "status" | "pick"> => ({
  id: "2026-barbatos-tanroth",
  status: "RUNNING",
  pick: null,
  ...overrides,
});

describe("shouldAutoOpenFactionWarPick", () => {
  it("opens during a running war the player has not picked in", () => {
    expect(shouldAutoOpenFactionWarPick(war(), {})).toBe(true);
  });

  it("stays closed once the player picked, before or after the war runs", () => {
    const pick: FactionWarResponseDto["pick"] = {
      faction: "BARBATOS",
      characterName: "Rzepa",
      world: "luvia",
      pickedAt: "2026-10-20T10:00:00.000Z",
      hiddenFromLeaderboard: false,
      points: 0,
      todayBySource: { KILL: 0, LOOT: 0, ONLINE: 0, PVP: 0 },
    };

    expect(shouldAutoOpenFactionWarPick(war({ pick }), {})).toBe(false);
    expect(shouldAutoOpenFactionWarPick(war({ status: "UPCOMING" }), {})).toBe(
      false,
    );
    expect(shouldAutoOpenFactionWarPick(war({ status: "ENDED" }), {})).toBe(
      false,
    );
    expect(shouldAutoOpenFactionWarPick(undefined, {})).toBe(false);
  });

  it("remembers 'Nie teraz' for that war only", () => {
    const dismissed = dismissFactionWarPick({}, "2026-barbatos-tanroth");

    expect(shouldAutoOpenFactionWarPick(war(), dismissed)).toBe(false);
    expect(
      shouldAutoOpenFactionWarPick(
        { ...war(), id: "2027-next-war" },
        dismissed,
      ),
    ).toBe(true);
  });
});

describe("getFactionUnderdogBonus", () => {
  const totals: FactionWarResponseDto["totals"] = [
    {
      faction: "BARBATOS",
      points: 140,
      rawPoints: 100,
      players: 40,
      multiplier: 1.4,
    },
    {
      faction: "TANROTH",
      points: 300,
      rawPoints: 300,
      players: 60,
      multiplier: 1,
    },
  ];

  it("shows the bonus only on the faction with fewer players", () => {
    expect(getFactionUnderdogBonus({ totals }, "BARBATOS")).toBe(1.4);
    expect(getFactionUnderdogBonus({ totals }, "TANROTH")).toBeNull();
  });
});
