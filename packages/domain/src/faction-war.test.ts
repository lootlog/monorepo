import { describe, expect, it } from "bun:test";
import {
  FACTION_WARS,
  factionWarStandings,
  factionWarWinners,
  findChampionFactionWar,
  type FactionWar,
} from "./faction-war.js";

const war = (id: string, startsAt: string, endsAt: string): FactionWar => ({
  ...FACTION_WARS[0]!,
  id,
  startsAt,
  endsAt,
});

const first = war("first", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");

const second = war("second", "2026-06-01T00:00:00Z", "2026-07-01T00:00:00Z");

describe("faction war champions", () => {
  it("keep their highlight until the next war ends", () => {
    const wars = [first, second];

    expect(
      findChampionFactionWar(Date.parse("2026-01-15T00:00:00Z"), wars),
    ).toBeUndefined();
    expect(
      findChampionFactionWar(Date.parse("2026-03-01T00:00:00Z"), wars)?.id,
    ).toBe("first");
    expect(
      findChampionFactionWar(Date.parse("2026-06-15T00:00:00Z"), wars)?.id,
    ).toBe("first");
    expect(
      findChampionFactionWar(Date.parse("2026-07-01T00:00:00Z"), wars)?.id,
    ).toBe("second");
  });

  it("crown both factions on a tie and nobody in a war without points", () => {
    const factions = first.factions;

    expect(factionWarWinners({ BARBATOS: 10, TANROTH: 10 }, factions)).toEqual([
      ...factions,
    ]);
    expect(factionWarWinners({ BARBATOS: 0, TANROTH: 0 }, factions)).toEqual(
      [],
    );
  });
});

describe("faction war underdog bonus", () => {
  const day = (
    date: string,
    faction: "BARBATOS" | "TANROTH",
    points: number,
    activePlayers: number,
  ) => ({ day: date, faction, points, activePlayers });

  it("multiplies only the smaller faction's score, per day, up to the cap", () => {
    const standings = factionWarStandings(first, [
      // 300 vs 200 active: Barbatos ×1.5.
      day("2026-01-02", "TANROTH", 3000, 300),
      day("2026-01-02", "BARBATOS", 2000, 200),
      // 500 vs 100 active: capped at ×2, not ×5.
      day("2026-01-03", "TANROTH", 5000, 500),
      day("2026-01-03", "BARBATOS", 1000, 100),
    ]);

    expect(standings.rawPoints).toEqual({ BARBATOS: 3000, TANROTH: 8000 });
    expect(standings.score).toEqual({ BARBATOS: 5000, TANROTH: 8000 });
    expect(standings.currentMultipliers).toEqual({ BARBATOS: 2, TANROTH: 1 });
  });

  it("gives no bonus on a day the other faction did not play", () => {
    const standings = factionWarStandings(first, [
      day("2026-01-02", "BARBATOS", 100, 10),
    ]);

    expect(standings.score).toEqual({ BARBATOS: 100, TANROTH: 0 });
  });
});
