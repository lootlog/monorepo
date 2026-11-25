import { maxBy } from "es-toolkit";
import { itemStatValue } from "@lootlog/domain/item-stat";
import { upgradedItemLevel } from "@lootlog/domain/item-upgrade";
import {
  anguishDamage,
  isCalculableLegendaryBonus,
  LEGENDARY_BONUS_START_VALUES,
  legendaryBonusValue,
  wornLegendaryBonusItems,
} from "@/lib/calculators";
import { characterStats, type CharacterStats } from "@/lib/character-stats";
import type { Profession } from "@/lib/equipment-set";
import {
  type BattleMastery,
  NORMAL_ATTACK,
  STEP_FORWARD,
} from "@/lib/skills/battle-mastery";
import { sumSkillBonuses } from "@/lib/skills/skill-stats";
import {
  skillPlanLevel,
  skillRankStats,
  skillState,
  skillValueAt,
  type SkillDefinition,
  type SkillRanks,
  type SkillWeapon,
} from "@/lib/skills/skill-tree";
import {
  NO_LEGENDARY_BONUSES,
  type BattlePosition,
  type Combatant,
  type LegendaryBonuses,
  type PassiveEffects,
  type ResourceDrain,
} from "./fight-state";
import {
  SIMULATED_ACTIVE_EFFECTS,
  isSimulatedActive,
  type ActiveSkill,
  type ComboGain,
  type MasteryQueue,
} from "./fight-skills";

export type FighterItem = { item: { type: string | null; stat: string } };

export type FighterProfile = {
  profession: Profession;
  level: number;
  position: BattlePosition;
  stats: CharacterStats;
  extra: Record<string, number>;
  skillSlow: number;
  slowMax: number;
  ignoredActives: string[];
  mastery: MasteryQueue;
  comboGain: ComboGain;
  legendary: LegendaryBonuses;
  energyDrain: ResourceDrain;
  manaDrain: ResourceDrain;
  passives: PassiveEffects;
};

const EXTRA_SKILL_KEYS = [
  "evade_per",
  "blok_per",
  "decevade_per",
  "heal1_per",
  "redslow",
  "fastarrow",
  "critslow_per",
  "dmg_from_player_per",
  "dmgmulabsolute",
  "energygain",
  "redstun",
  "pcontra",
  "rage",
  "rage_3turns",
  "redacdmg_per",
  "absorbd",
  "absagain_per",
  "redabdest_per",
  "reddest_per",
  "swing",
  "critmval_f",
  "critmval_c",
  "critmval_l",
];

const RESOURCE_DRAINS = { energy: "enfatig", mana: "manafatig" } as const;

const MAX_DRAIN_CHANCE = 100;

const resourceDrain = (items: readonly FighterItem[], key: string) => {
  const drains = items.flatMap(({ item }) => {
    const [chance = 0, amount = 0] = (itemStatValue(item.stat, key) ?? "")
      .split(",")
      .map(Number);

    return Number.isFinite(chance) && Number.isFinite(amount)
      ? [{ chance, amount }]
      : [];
  });

  return {
    chance: Math.min(
      MAX_DRAIN_CHANCE,
      totalOf(drains.map((drain) => drain.chance)),
    ),
    amount: Math.max(0, ...drains.map((drain) => drain.amount)),
  };
};

const POSITION_BY_WEAPON: ReadonlyMap<string, BattlePosition> = new Map([
  ["WAND_WEAPON", 2],
  ["DISTANCE_WEAPON", 3],
]);

const hasArrows = (items: readonly FighterItem[]) =>
  items.some(({ item }) => item.type === "QUIVER");

const battlePosition = (items: readonly FighterItem[]): BattlePosition =>
  items.reduce<BattlePosition>((position, { item }) => {
    const weaponPosition = POSITION_BY_WEAPON.get(item.type ?? "");

    return weaponPosition === 3 && !hasArrows(items)
      ? position
      : (weaponPosition ?? position);
  }, 1);

const COMBO_EVENTS = ["crit", "pierce", "wound", "block"] as const;

const LAST_HEAL_RANGE = { min: 36, max: 44 };

const legendaryBonuses = (
  items: readonly FighterItem[],
  stats: CharacterStats,
  level: number,
): LegendaryBonuses => {
  const worn = wornLegendaryBonusItems(
    items.map(({ item }) => item.stat),
    level,
  );

  const strengthsOf = (name: string) =>
    worn.flatMap((bonus) =>
      bonus.name === name
        ? [Number.isNaN(bonus.strength) ? 1 : bonus.strength]
        : [],
    );

  const valueOf = (name: string) =>
    isCalculableLegendaryBonus(name)
      ? legendaryBonusValue(
          LEGENDARY_BONUS_START_VALUES[name],
          strengthsOf(name),
        )
      : 0;

  const anguishItem = maxBy(
    worn.filter(
      (bonus) => bonus.name === "anguish" && Number.isFinite(bonus.itemLevel),
    ),
    (bonus) => upgradedItemLevel(bonus.itemLevel, bonus.upgrade),
  );

  const lastHeal = strengthsOf("lastheal");

  return {
    ...NO_LEGENDARY_BONUSES,
    verycrit: valueOf("verycrit"),
    holytouch: valueOf("holytouch"),
    curse: valueOf("curse"),
    glare: valueOf("glare"),
    critred: valueOf("critred"),
    facade: valueOf("facade"),
    cleanse: valueOf("cleanse"),
    puncture: valueOf("puncture"),
    anguish: {
      chance: valueOf("anguish"),
      damage:
        anguishItem && anguishItem.itemLevel > 0
          ? anguishDamage({
              itemLevel: anguishItem.itemLevel,
              upgrade: anguishItem.upgrade,
              strength: stats.strength,
              intellect: stats.intellect,
              agility: stats.agility,
            })
          : 0,
    },
    lastheal:
      lastHeal.length > 0
        ? {
            min: legendaryBonusValue(LAST_HEAL_RANGE.min, lastHeal),
            max: legendaryBonusValue(LAST_HEAL_RANGE.max, lastHeal),
          }
        : null,
  };
};

const itemNumber = ({ item }: FighterItem, key: string) => {
  const value = itemStatValue(item.stat, key);
  const number = Number(value?.split(",").at(-1));

  return Number.isFinite(number) ? number : 0;
};

const totalOf = (values: readonly number[]) =>
  values.reduce((total, value) => total + value, 0);

const durationOf = (raw: string) => {
  const turns = Number(raw.split("@")[1]);

  return Number.isFinite(turns) && turns > 0 ? turns : 0;
};

const SINGLE_TURN_EFFECTS: ReadonlySet<string> = new Set([
  "disturb_crit",
  "disturb_pierce",
  "sa_per",
  "acshield_per",
  "active_block_per",
]);

const LOGGED_SKILL_VALUES: ReadonlyMap<string, string> = new Map(
  [
    "resfire_per",
    "resfrost_per",
    "reslight_per",
    "antidote",
    "achpp_per",
    "active_decblock_per",
    "active_absorbdest_per",
    "active_decblock_per-enemies",
    "alllowdmg",
    "active_block_per",
    "allslow_per",
    "aura-sa_per",
    "aura-ac_per",
    "aura-resall",
    "healall_per",
    "critval-allies",
    "critmval-allies",
    "critval-enemies",
    "critmval-enemies",
    "lowheal_per-enemies",
    "energyout",
  ]
    .map((key): [string, string] => [key, key])
    .concat([["aura-adddmg2_per-meele_physical", "aura-adddmg2_per-meele"]]),
);

const LOGGED_SKILL_FLAGS = new Map([
  ["sunshield_per", "sunshield_per"],
  ["en-regen", "en-regen-cast"],
  ["lightshield_per", "lightshield"],
  ["taken_dmg_per-all", "+spell-taken_dmg-all"],
  ["taken_dmg_per", "spell-taken_dmg"],
  ["stinkbomb_crit", "stinkbomb_crit"],
  ["stinkbomb_pierce", "stinkbomb_pierce"],
  ["removestun-allies", "removestun-allies"],
  ["removedot-allies", "removedot-allies"],
]);

export const activeSkill = (
  skill: SkillDefinition,
  rank: number,
  level: number,
): ActiveSkill => {
  const stats = skillRankStats(skill, rank);
  const resource = stats.has("mana") ? "mana" : "energy";
  const longest = Math.max(1, ...[...stats.values()].map(durationOf));

  const effects = new Map(
    [...stats].flatMap(([key, raw]) => {
      const value = SIMULATED_ACTIVE_EFFECTS.has(key)
        ? skillValueAt(raw, level)
        : undefined;

      return value === undefined
        ? []
        : [
            [
              key,
              {
                value,
                turns:
                  durationOf(raw) ||
                  (SINGLE_TURN_EFFECTS.has(key) ? 1 : longest),
              },
            ] as const,
          ];
    }),
  );

  return {
    id: skill.id,
    name: skill.name,
    resource,
    cost: skillValueAt(stats.get(resource) ?? "0", level) ?? 0,
    cooldown: skillValueAt(stats.get("cooldown") ?? "0", level) ?? 0,
    selfCast: skill.selfCast ?? false,
    melee: skill.melee ?? false,
    attacks: !skill.selfCast && !skill.spell,
    effects,
    logged: [...stats].flatMap(
      ([key, raw]): (readonly [string, number | null])[] => {
        const flag = LOGGED_SKILL_FLAGS.get(key);

        if (flag) return [[flag, null]];

        const logged = LOGGED_SKILL_VALUES.get(key);
        const value = logged ? skillValueAt(raw, level) : undefined;

        return logged === undefined || value === undefined
          ? []
          : [[logged, value]];
      },
    ),
  };
};

const learnedSkillEffects = (
  tree: readonly SkillDefinition[],
  ranks: SkillRanks,
  level: number,
  weapons: ReadonlySet<SkillWeapon>,
) => {
  let skillSlow = 0;
  const actives: ActiveSkill[] = [];
  const ignoredActives: string[] = [];
  const comboGain = { crit: 0, pierce: 0, wound: 0, block: 0 };
  const bounds = new Map<string, number>();

  for (const skill of tree) {
    const state = skillState(skill, ranks, level, weapons);

    if (state.rank === 0 || state.inactive) continue;

    const rankStats = skillRankStats(skill, state.rank);

    for (const [key, raw] of rankStats) {
      const bound = Number(raw.split("@")[0]?.split("/")[1]);

      if (Number.isFinite(bound)) bounds.set(key, bound);
    }

    for (const event of COMBO_EVENTS) {
      comboGain[event] +=
        skillValueAt(rankStats.get(`combo-${event}`) ?? "0", level) ?? 0;
    }

    if (skill.active) {
      const active = activeSkill(skill, state.rank, level);

      if (isSimulatedActive(active)) actives.push(active);
      else ignoredActives.push(skill.name);

      continue;
    }

    const slow = rankStats.get("slow");

    if (slow !== undefined) skillSlow += skillValueAt(slow, level) ?? 0;
  }

  return {
    skillSlow,
    actives,
    ignoredActives,
    comboGain,
    bounds,
  };
};

const passiveEffects = (
  bonuses: ReadonlyMap<string, number>,
  bounds: ReadonlyMap<string, number>,
): PassiveEffects => {
  const valueOf = (key: string) => bonuses.get(key) ?? 0;

  const bounded = (key: string) => ({
    value: valueOf(key),
    bound: bounds.get(key) ?? 0,
  });

  return {
    energyBack: valueOf("engback"),
    injureChance: valueOf("injure"),
    critWoundChance: valueOf("critwound"),
    poisonWeakening: valueOf("poison_lowdmg_per-enemies"),
    poisonResistanceDestruction: valueOf("actdmg"),
    thirdAttackChance: valueOf("of-thirdatt"),
    crush: bounded("crush_dmg_physical"),
    critSpeed: bounded("critsa"),
    critPoison: bounded("critpoison"),
    enemyHealing: valueOf("heal_per-enemies"),
    allyHealing: valueOf("heal_per-allies"),
    allyHealth: valueOf("hp_per-allies"),
    vulture: valueOf("vulture_perw"),
    arrowBlockChance: valueOf("arrowblock"),
    critRage: valueOf("critrage_perw"),
    critPierce: valueOf("critpierce_per"),
    distractChance: valueOf("distract"),
    lastCrit: bounded("lastcrit"),
    adrenalinEvade: bounded("adrenalin_evade"),
    adrenalinSpeed: bounded("adrenalin_sa"),
    adrenalinDrainReduction: bounded("adrenalin_reddest"),
    blockReduction: valueOf("decblock_per"),
    manaGain: valueOf("managain"),
  };
};

const masteryQueue = (
  { actions, repeat }: BattleMastery,
  actives: readonly ActiveSkill[],
): MasteryQueue => ({
  repeat,
  steps: actions.map((action) => {
    if (action === NORMAL_ATTACK) return "attack";

    if (action === STEP_FORWARD) return "step";

    return actives.find((active) => active.id === action) ?? null;
  }),
});

export const fighterProfile = ({
  profession,
  level,
  items,
  tree,
  ranks,
  weapons,
  mastery,
}: {
  profession: Profession;
  level: number;
  items: readonly FighterItem[];
  tree: readonly SkillDefinition[];
  ranks: SkillRanks;
  weapons: ReadonlySet<SkillWeapon>;
  mastery: BattleMastery;
}): FighterProfile => {
  const bonuses = sumSkillBonuses(tree, ranks, level, weapons);
  const learned = learnedSkillEffects(tree, ranks, level, weapons);

  const stats = characterStats(
    profession,
    skillPlanLevel(level),
    items,
    bonuses,
  );

  const extra: Record<string, number> = {};

  for (const key of EXTRA_SKILL_KEYS) {
    extra[key] = bonuses.get(key) ?? 0;
  }

  const slows = items.map((item) => itemNumber(item, "slow"));

  extra.shields = items.filter((item) => item.item.type === "SHIELD").length;

  extra.shieldArmor = totalOf(
    items.flatMap((item) =>
      item.item.type === "SHIELD" ? [itemNumber(item, "ac")] : [],
    ),
  );

  extra.slowSum = totalOf(slows);

  extra.redstun =
    (bonuses.get("redstun") ?? 0) +
    totalOf(items.map((item) => itemNumber(item, "redstun")));

  extra.itemDamage = totalOf(items.map((item) => itemNumber(item, "dmgmul")));

  extra.itemLightDamage = totalOf(
    items.map((item) => itemNumber(item, "dmgmullight")),
  );

  extra.itemUnavoidable = totalOf(
    items.map((item) => itemNumber(item, "dmgmulabsolute")),
  );

  return {
    profession,
    level,
    position: battlePosition(items),
    stats,
    extra,
    skillSlow: learned.skillSlow,
    slowMax: Math.max(0, ...slows),
    ignoredActives: learned.ignoredActives,
    mastery: masteryQueue(mastery, learned.actives),
    comboGain: learned.comboGain,
    legendary: legendaryBonuses(items, stats, level),
    energyDrain: resourceDrain(items, RESOURCE_DRAINS.energy),
    manaDrain: resourceDrain(items, RESOURCE_DRAINS.mana),
    passives: passiveEffects(bonuses, learned.bounds),
  };
};

export const toCombatant = (
  profile: FighterProfile,
  name: string,
): Combatant => {
  const { stats, extra } = profile;
  const extraOf = (key: string) => extra[key] ?? 0;

  return {
    name,
    profession: profile.profession,
    level: profile.level,
    position: profile.position,
    hp: stats.hp,
    physical: stats.physical,
    offhand: stats.offhand,
    fire: stats.fire,
    frost: stats.frost,
    frostSlow: stats.frostSlow,
    light: stats.light,
    poison: stats.poison,
    wound: stats.wound,
    offhandPoison: stats.offhandPoison,
    offhandWound: stats.offhandWound,
    attackSpeed: stats.attackSpeed,
    critChance: stats.critChance,
    critValue: stats.critValue,
    critMagicValue: stats.critMagicValue,
    critMagicBonus: {
      fire: extraOf("critmval_f"),
      frost: extraOf("critmval_c"),
      light: extraOf("critmval_l"),
    },
    offhandCritChance: stats.offhandCritChance,
    offhandCritValue: stats.offhandCritValue,
    critReduction: stats.critReduction,
    critValueReduction: stats.critValueReduction,
    pierce: stats.pierce,
    pierceBlock: stats.pierceBlock,
    armor: stats.armor,
    shieldArmor: extraOf("shieldArmor"),
    hasShield: extraOf("shields") > 0,
    armorDestruction: stats.armorDestruction,
    armorDestructionResist: stats.armorDestructionResist,
    evadePoints: stats.evadeItemPoints,
    evadePercent: extraOf("evade_per"),
    evadeReduction: stats.evadeItemReduction,
    evadeReductionPercent: extraOf("decevade_per"),
    blockPoints: stats.blockItemPoints,
    blockPercent: extraOf("blok_per"),
    absorb: stats.absorb,
    absorbMagic: stats.absorbMagic,
    absorbDistance: extraOf("absorbd"),
    absorbRenewal: extraOf("absagain_per"),
    absorbDestruction: stats.absorbDestruction,
    absorbDestructionReduction: extraOf("redabdest_per"),
    resistanceDestruction: stats.resistanceDestruction,
    energyDrain: profile.energyDrain,
    manaDrain: profile.manaDrain,
    drainReduction: extraOf("reddest_per"),
    drainResist: stats.drainResist,
    swingChance: extraOf("swing"),
    resistFire: stats.resFire,
    resistFrost: stats.resFrost,
    resistLight: stats.resLight,
    resistPoison: stats.resistPoison,
    resistWound: stats.resistWound,
    healing: stats.healingItem,
    healingBonus: extraOf("heal1_per"),
    enemyHealingCut: stats.enemyHealingCut,
    energy: stats.energy,
    energyGain: extraOf("energygain"),
    mana: stats.mana,
    allDamageBonus: extraOf("itemDamage"),
    physicalBonus: stats.physicalBonus,
    lightDamageBonus: extraOf("itemLightDamage"),
    unavoidableBonus: extraOf("dmgmulabsolute") + extraOf("itemUnavoidable"),
    damageTakenBonus: extraOf("dmg_from_player_per"),
    enemySlow: (extraOf("slowSum") + profile.skillSlow) / 100,
    slowReduction: extraOf("redslow"),
    stunReduction: extraOf("redstun"),
    counterChance: stats.counterChance,
    parryChance: stats.parryChance,
    parryCounterChance: extraOf("pcontra"),
    rageTurns: extraOf("rage"),
    rageBonus: extraOf("rage_3turns"),
    armorDestructionReduction: extraOf("redacdmg_per"),
    fastArrowChance: extraOf("fastarrow"),
    critSlow: extraOf("critslow_per"),
    comboGain: profile.comboGain,
    mastery: profile.mastery,
    legendary: profile.legendary,
    passives: profile.passives,
  };
};
