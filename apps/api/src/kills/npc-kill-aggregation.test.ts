import { describe, expect, it } from "bun:test";
import { addNpcKills, type NpcKillTotal } from "./npc-kill-aggregation.js";

describe("NPC kill aggregation", () => {
  it("sums participations while keeping the highest-level snapshot and first snapshot on ties", () => {
    const totals = new Map<number, NpcKillTotal>();
    const base = {
      npcId: 7,
      npcName: "Earlier",
      npcType: "HERO",
      npcLvl: 100,
      npcProf: "w",
      npcIcon: "first.gif",
    };
    addNpcKills(totals, base, 2);
    addNpcKills(
      totals,
      { ...base, npcName: "Higher", npcLvl: 110, npcIcon: "higher.gif" },
      3,
    );
    addNpcKills(totals, { ...base, npcName: "Tie", npcLvl: 110 }, 5);
    addNpcKills(totals, { ...base, npcName: "Lower", npcLvl: 90 }, 1);
    expect(totals.get(7)).toEqual({
      ...base,
      npcName: "Higher",
      npcLvl: 110,
      npcIcon: "higher.gif",
      totalKills: 11,
    });
  });

  it("keeps distinct NPC identities even when their display names match", () => {
    const totals = new Map<number, NpcKillTotal>();
    const npc = {
      npcId: 1,
      npcName: "Same",
      npcType: "HERO",
      npcLvl: 100,
      npcProf: null,
      npcIcon: null,
    };
    addNpcKills(totals, npc, 2);
    addNpcKills(totals, { ...npc, npcId: 2 }, 3);
    expect(
      [...totals.values()].map(({ npcId, totalKills }) => ({
        npcId,
        totalKills,
      })),
    ).toEqual([
      { npcId: 1, totalKills: 2 },
      { npcId: 2, totalKills: 3 },
    ]);
  });
});
