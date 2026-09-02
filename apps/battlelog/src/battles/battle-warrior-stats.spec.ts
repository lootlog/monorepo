import { describe, expect, it } from "bun:test";
import {
  buildBattleWarriorStats,
  inflateBattleWarrior,
} from "./battle-warrior-stats.js";
import type { BattleWarrior } from "#src/shared/modules/drizzle/schema";

const createBattleWarriorRow = (
  overrides: Partial<Omit<BattleWarrior, "stats">> & {
    stats?: Partial<BattleWarrior["stats"]>;
  } = {},
): BattleWarrior =>
  ({
    id: "warrior-1",
    battleId: "battle-1",
    originalId: "character-1",
    name: "Player",
    lvl: 100,
    prof: "w",
    icon: "icon.gif",
    team: 1,
    turns: 2,
    turnsLost: 1,
    steps: 3,
    normalAttacks: 4,
    spellsUsed: 5,
    spellsUsedMap: { Fireball: 2 },
    stats: {},
    statsVersion: 1,
    isDead: false,
    surrendered: false,
    fled: false,
    maxHp: 1000,
    damageDealt: 100,
    distanceDamage: 10,
    meleeDamage: 20,
    auxiliaryDamage: 30,
    fireDamage: 40,
    frostDamage: 50,
    lightningDamage: 60,
    thirdAttDamage: 70,
    damageDealtAfterDefensive: 80,
    damageDealtAfterDefensivePercentage: 8,
    damageTaken: 90,
    distanceDamageTaken: 11,
    meleeDamageTaken: 22,
    auxiliaryDamageTaken: 33,
    fireDamageTaken: 44,
    frostDamageTaken: 55,
    lightningDamageTaken: 66,
    thirdAttDamageTaken: 77,
    flatDamageTaken: 88,
    rageDamageDealt: 99,
    trueDamageDealt: 101,
    trueDamageTaken: 102,
    stigmaDamageDealt: 103,
    stigmaDamageTaken: 104,
    passiveHealing: 105,
    activeHealing: 106,
    armorPierces: 107,
    criticalHits: 108,
    reducedArmor: 109,
    reducedPoisonResistance: 110,
    magicResistanceDestroyed: 111,
    evasions: 112,
    attacksEvaded: 113,
    counters: 114,
    fastArrows: 115,
    blocks: 116,
    attacksBlocked: 117,
    blockedDamage: 118,
    woundDamageTaken: 119,
    poisonDamageTaken: 120,
    injureDamageTaken: 121,
    injures: 122,
    critWoundDamageTaken: 123,
    firePassiveDamageTaken: 124,
    lightningPassiveDamageTaken: 125,
    destroyedEnergy: 126,
    destroyedMana: 127,
    regeneratedEnergy: 128,
    regeneratedMana: 129,
    reflectedDamage: 130,
    reflectedDamageTaken: 131,
    legbons: 132,
    legbonCurse: 133,
    legbonCleanse: 134,
    legbonLastheal: 135,
    legbonLasthealValue: 136,
    legbonGlare: 137,
    legbonHolytouch: 138,
    legbonHolytouchValue: 139,
    legbonCritredValue: 140,
    legbonFacadeValue: 141,
    legbonPunctureValue: 142,
    legbonVerycrit: 143,
    legbonAnguish: 144,
    legbonAnguishDamageTaken: 145,
    ph: 12,
    ...overrides,
  }) as BattleWarrior;

describe("battle warrior stats", () => {
  it("builds the JSONB stats payload from warrior metrics", () => {
    const row = createBattleWarriorRow();
    const stats = buildBattleWarriorStats(row);

    expect(stats).toMatchObject({
      turns: 2,
      turnsLost: 1,
      spellsUsedMap: { Fireball: 2 },
      isDead: false,
      damageDealt: 100,
      legbonAnguishDamageTaken: 145,
    });
    expect("originalId" in stats).toBe(false);
    expect("ph" in stats).toBe(false);
  });

  it("inflates a legacy row when stats is empty", () => {
    const row = createBattleWarriorRow({ stats: {} });
    const warrior = inflateBattleWarrior(row);

    expect(warrior.damageDealt).toBe(100);
    expect(warrior.blockedDamage).toBe(118);
    expect(warrior.spellsUsedMap).toEqual({ Fireball: 2 });
    expect("stats" in warrior).toBe(false);
    expect("statsVersion" in warrior).toBe(false);
  });

  it("prefers stats JSONB values for metrics", () => {
    const row = createBattleWarriorRow({
      damageDealt: 100,
      stats: {
        damageDealt: 999,
        blockedDamage: 333,
        spellsUsedMap: { Freeze: 4 },
      },
    });
    const warrior = inflateBattleWarrior(row);

    expect(warrior.damageDealt).toBe(999);
    expect(warrior.blockedDamage).toBe(333);
    expect(warrior.spellsUsedMap).toEqual({ Freeze: 4 });
  });

  it("keeps hot filter fields from columns", () => {
    const row = createBattleWarriorRow({
      name: "ColumnName",
      lvl: 85,
      team: 2,
      ph: 25,
      stats: {
        damageDealt: 777,
      },
    });
    const warrior = inflateBattleWarrior(row);

    expect(warrior.name).toBe("ColumnName");
    expect(warrior.lvl).toBe(85);
    expect(warrior.team).toBe(2);
    expect(warrior.ph).toBe(25);
    expect(warrior.damageDealt).toBe(777);
  });
});
