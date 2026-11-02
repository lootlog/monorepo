import { describe, expect, it } from "bun:test";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import {
  getEventHeroNpcId,
  getKillNpcId,
  getTimerNpcId,
  newManualTimerNpcId,
} from "./npc-identity.js";

const TRACKER = "Wtajemniczony Tropiciel Herosów";

describe("NPC identity", () => {
  // Derived ids are stored in kill tables, timer keys and event records.
  it("keeps the ids already stored for colossi, trackers and event heroes", () => {
    expect(getKillNpcId({ id: 1, name: "Lulukav" }, NpcType.COLOSSUS)).toBe(
      -2111221842,
    );
    expect(getTimerNpcId({ id: 190436, name: TRACKER })).toBe(-1349578649);
    expect(
      getEventHeroNpcId({
        id: "0b7c6a52-4c1e-4f0e-9a43-2c1d2c7f6e11",
        npcId: null,
      }),
    ).toBe(-1062857334);
  });

  it("counts every colossus spawn of one name under one id", () => {
    expect(
      getKillNpcId({ id: 99999, name: "Mroczny Kolos" }, NpcType.COLOSSUS),
    ).toBe(
      getKillNpcId({ id: 88888, name: "Mroczny Kolos" }, NpcType.COLOSSUS),
    );
  });

  it("gives a Hero Tracker one id across hiding places, for timers and kills", () => {
    const first = getTimerNpcId({ id: 190436, name: TRACKER });

    expect(getTimerNpcId({ id: 201377, name: ` ${TRACKER}  ` })).toBe(first);
    expect(getKillNpcId({ id: 201377, name: TRACKER }, NpcType.NPC)).toBe(
      first,
    );
    expect(getTimerNpcId({ id: 190436, name: "Tropiciel Herosów" })).not.toBe(
      first,
    );
  });

  it("keeps the runtime id of other NPCs", () => {
    expect(getTimerNpcId({ id: 12345, name: "Tropicielka Albiona" })).toBe(
      12345,
    );
    expect(getKillNpcId({ id: -12345, name: "Hero" }, NpcType.HERO)).toBe(
      12345,
    );
  });

  it("uses an event hero's runtime id once it is known", () => {
    expect(getEventHeroNpcId({ id: "hero", npcId: 777 })).toBe(777);
    expect(getEventHeroNpcId({ id: "hero", npcId: null })).toBeLessThan(0);
  });

  it("allocates manual timer ids outside the Margonem runtime range", () => {
    const id = newManualTimerNpcId();

    expect(id).toBeGreaterThanOrEqual(1_000_000_000);
    expect(id).toBeLessThan(2_147_483_647);
  });
});
