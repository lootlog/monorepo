import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import type { Profession } from "@/lib/equipment-set";
import type { SkillBonuses } from "@/lib/skills/skill-stats";
import { SKILL_LEVEL_CAP } from "@/lib/skills/skill-tree";

/*
 * A character's window stats from its profession, level, worn items and
 * learned skills, as the game derives them. The formulas follow Margonem's
 * documentation (https://pomoc.margonem.pl/index/view,372) and the openmargo
 * engine's character stats, which reproduces the game's numbers.
 */

type Attributes = { strength: number; agility: number; intellect: number };

type AttributeGains = { odd: Attributes; even: Attributes };

const gain = (strength: number, agility: number, intellect: number) => ({
  strength,
  agility,
  intellect,
});

/**
 * What each profession gains on every level: one split up to level 20 and
 * another from 21, which may differ on odd and even levels.
 */
const ATTRIBUTE_GAINS: Record<
  Profession,
  { early: AttributeGains; mature: AttributeGains }
> = {
  w: {
    early: { odd: gain(4, 1, 0), even: gain(4, 1, 0) },
    mature: { odd: gain(5, 0, 0), even: gain(5, 0, 0) },
  },
  p: {
    early: { odd: gain(3, 0, 2), even: gain(2, 1, 2) },
    mature: { odd: gain(3, 0, 2), even: gain(2, 0, 3) },
  },
  b: {
    early: { odd: gain(3, 2, 0), even: gain(3, 2, 0) },
    mature: { odd: gain(3, 2, 0), even: gain(2, 3, 0) },
  },
  m: {
    early: { odd: gain(1, 1, 3), even: gain(1, 1, 3) },
    mature: { odd: gain(0, 0, 5), even: gain(0, 0, 5) },
  },
  h: {
    early: { odd: gain(1, 4, 0), even: gain(1, 4, 0) },
    mature: { odd: gain(0, 5, 0), even: gain(0, 5, 0) },
  },
  t: {
    early: { odd: gain(1, 2, 2), even: gain(1, 2, 2) },
    mature: { odd: gain(0, 3, 2), even: gain(0, 2, 3) },
  },
};

const MATURE_FROM_LEVEL = 21;

const cappedLevel = (level: number) =>
  Math.min(SKILL_LEVEL_CAP, Math.max(1, Math.floor(level)));

/** The attributes a profession has at a level without any item. */
export const baseAttributes = (
  profession: Profession,
  level: number,
): Attributes => {
  const attributes = gain(4, 3, 3);
  const gains = ATTRIBUTE_GAINS[profession];

  for (let reached = 2; reached <= cappedLevel(level); reached += 1) {
    const phase = reached < MATURE_FROM_LEVEL ? gains.early : gains.mature;
    const levelGain = reached % 2 === 0 ? phase.even : phase.odd;

    attributes.strength += levelGain.strength;
    attributes.agility += levelGain.agility;
    attributes.intellect += levelGain.intellect;
  }

  return attributes;
};

export type DamageRange = { min: number; max: number };

/** An effect a hit may cause: how likely it is and how much it deals. */
export type ChanceDamage = { chance: number; damage: number };

export type CharacterStats = {
  hp: number;
  strength: number;
  agility: number;
  intellect: number;
  physical: DamageRange;
  offhand: DamageRange;
  fire: DamageRange;
  frost: DamageRange;
  light: DamageRange;
  poison: ChanceDamage;
  wound: ChanceDamage;
  attackSpeed: number;
  /** Chances in percent; multipliers as the percentage a crit deals. */
  critChance: number;
  critValue: number;
  critMagicValue: number;
  pierce: number;
  armor: number;
  evadePoints: number;
  /** Against an opponent of the same level, as the game's window shows it. */
  evadeChance: number;
  blockPoints: number;
  blockChance: number;
  absorb: number;
  absorbMagic: number;
  absorbLimit: number;
  resFire: number;
  resFrost: number;
  resLight: number;
  healing: number;
  mana: number;
  energy: number;
};

type WornItem = { item: { type: string | null; stat: string } };

const NUMBER_LIST = /^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*$/;

/** A stat's numbers: `a,b` for ranges and chance with damage. */
const statNumbers = (value: string | boolean) =>
  NUMBER_LIST.test(String(value)) ? String(value).split(",").map(Number) : [];

type ItemSums = {
  /** Every single-number stat summed, by key. */
  flat: Map<string, number>;
  mainDamage: DamageRange;
  offhandDamage: DamageRange;
  mainCrit: number;
  offhandCrit: number;
  mainCritValue: number;
  fire: DamageRange;
  frost: DamageRange;
  light: DamageRange;
  poison: ChanceDamage;
  wound: ChanceDamage;
};

const range = (numbers: readonly number[]): DamageRange =>
  numbers.length === 0
    ? { min: 0, max: 0 }
    : { min: Math.min(...numbers), max: Math.max(...numbers) };

const addRange = (left: DamageRange, right: DamageRange) => ({
  min: left.min + right.min,
  max: left.max + right.max,
});

const chanceDamage = (numbers: readonly number[]): ChanceDamage => {
  const [chance = 0, damage = chance] = numbers;

  return { chance: Math.max(0, chance), damage: Math.max(0, damage) };
};

/**
 * The worn items' stats added up. An auxiliary blade deals its damage,
 * crit and effects with the second hand; every other item adds to the main.
 */
const sumItems = (wornItems: readonly WornItem[]): ItemSums => {
  const sums: ItemSums = {
    flat: new Map(),
    mainDamage: { min: 0, max: 0 },
    offhandDamage: { min: 0, max: 0 },
    mainCrit: 0,
    offhandCrit: 0,
    mainCritValue: 0,
    fire: { min: 0, max: 0 },
    frost: { min: 0, max: 0 },
    light: { min: 0, max: 0 },
    poison: { chance: 0, damage: 0 },
    wound: { chance: 0, damage: 0 },
  };

  for (const { item } of wornItems) {
    const isOffhand = item.type === "HELP_WEAPON";

    for (const { key, value } of parseItemStats(item.stat)) {
      const numbers = statNumbers(value);

      if (numbers.length === 0) continue;

      if (key === "dmg") {
        if (isOffhand) {
          sums.offhandDamage = addRange(sums.offhandDamage, range(numbers));
        } else {
          sums.mainDamage = addRange(sums.mainDamage, range(numbers));
        }
      } else if (key === "fire") {
        sums.fire = addRange(sums.fire, range(numbers));
      } else if (key === "light") {
        sums.light = addRange(sums.light, range(numbers));
      } else if (key === "frost") {
        // Frost is `slow,damage`: only its last number is damage.
        const damage = numbers.at(-1) ?? 0;

        sums.frost = addRange(sums.frost, { min: damage, max: damage });
      } else if (key === "poison" || key === "wound") {
        const effect = chanceDamage(numbers);

        // The second hand's poison and wound act on its own hits.
        if (!isOffhand) {
          sums[key] = {
            chance: sums[key].chance + effect.chance,
            damage: sums[key].damage + effect.damage,
          };
        }
      } else if (numbers.length === 1) {
        const [number = 0] = numbers;

        if (key === "crit") {
          if (isOffhand) sums.offhandCrit += number;
          else sums.mainCrit += number;
        } else if (key === "critval") {
          if (!isOffhand) sums.mainCritValue += number;
        } else {
          sums.flat.set(key, (sums.flat.get(key) ?? 0) + number);
        }
      }
    }
  }

  return sums;
};

const MAX_RESISTANCE = 90;

const MAX_EVADE_OR_BLOCK_CHANCE = 50;

const BASE_CRIT_MULTIPLIER = 1.2;

const BASE_ENERGY = 50;

/** Fire and lightning spread a flat value into a range around it. */
const ELEMENT_SPREAD = 0.2;

const elementalDamage = (
  { min, max }: DamageRange,
  attributeBonus: number,
  multiplier: number,
  spread: number,
): DamageRange => {
  if (max <= 0) return { min: 0, max: 0 };

  if (min === max && spread > 0) {
    const average = (max + Math.floor(attributeBonus)) * multiplier;

    return {
      min: Math.floor(average * (1 - spread)),
      max: Math.floor(average * (1 + spread)),
    };
  }

  return {
    min: Math.round((min + attributeBonus) * multiplier),
    max: Math.round((max + attributeBonus) * multiplier),
  };
};

/**
 * The character window of a profession at a level, wearing the items with
 * the skills' bonuses, as the game counts them.
 */
export const characterStats = (
  profession: Profession,
  level: number,
  wornItems: readonly WornItem[],
  skills: SkillBonuses,
): CharacterStats => {
  const lvl = cappedLevel(level);
  const base = baseAttributes(profession, lvl);
  const items = sumItems(wornItems);
  const item = (key: string) => items.flat.get(key) ?? 0;
  const skill = (key: string) => skills.get(key) ?? 0;

  const allAttributes = item("da");
  const strength = base.strength + Math.floor(item("ds") + allAttributes);
  const agility = base.agility + Math.floor(item("dz") + allAttributes);
  const intellect = base.intellect + Math.floor(item("di") + allAttributes);

  const hp = Math.floor(
    Math.floor(20 * lvl ** 1.375) +
      strength * 5 +
      skill("hp") +
      item("hp") +
      (skill("hpbon") + item("hpbon")) * strength,
  );

  const attackSpeed =
    2 +
    Math.min(2, 0.02 * agility) +
    Math.max(0, 0.002 * (agility - 100)) +
    skill("sa1") / 100 +
    (item("sa") / 100) * (1 + skill("sa-clothes") / 100);

  const multiplier = 1 + item("dmgmul") / 100;
  const round = profession === "b" ? Math.floor : Math.round;

  const attributeDamage =
    agility * skill("agi") + strength * (skill("str1h") + skill("str2h"));

  const unarmed = Math.max(1, Math.floor(lvl / 4) - 1);

  const physicalMin = round(
    (items.mainDamage.min + attributeDamage) * multiplier,
  );

  const physicalMax = round(
    (items.mainDamage.max + attributeDamage) * multiplier,
  );

  const offhandBonus = strength * skill("of-str");

  const critDenominator = 0.5 * lvl;
  const absorbLimit = intellect * 7;

  const evadePoints =
    Math.round(agility / 30) +
    Math.floor(item("evade")) +
    Math.round((skill("evade_per") * lvl) / 20);

  const blockItems = Math.floor(item("blok"));

  const resistance = (key: string) =>
    Math.max(0, Math.min(MAX_RESISTANCE, item(key) + skill(key)));

  return {
    hp,
    strength,
    agility,
    intellect,
    physical:
      physicalMin > 0
        ? { min: physicalMin, max: physicalMax }
        : { min: unarmed, max: unarmed },
    offhand: {
      min: round((items.offhandDamage.min + offhandBonus) * multiplier),
      max: round((items.offhandDamage.max + offhandBonus) * multiplier),
    },
    fire: elementalDamage(
      items.fire,
      intellect * skill("firebon"),
      multiplier,
      ELEMENT_SPREAD,
    ),
    frost: elementalDamage(
      items.frost,
      intellect * skill("frostbon"),
      multiplier,
      0,
    ),
    light: elementalDamage(
      items.light,
      intellect * skill("lightbon"),
      multiplier,
      ELEMENT_SPREAD,
    ),
    poison: {
      chance: items.poison.chance,
      damage: Math.round(items.poison.damage * multiplier),
    },
    wound: {
      chance: items.wound.chance + skill("woundchance"),
      damage: Math.round(
        items.wound.damage * (1 + skill("wounddmgbon_perw") / 100),
      ),
    },
    attackSpeed,
    critChance: 1 + 0.02 * lvl + items.mainCrit + skill("crit"),
    critValue:
      (BASE_CRIT_MULTIPLIER +
        strength / critDenominator / 100 +
        items.mainCritValue / 100 +
        skill("critval") / 100) *
      100,
    critMagicValue:
      (BASE_CRIT_MULTIPLIER +
        intellect / critDenominator / 100 +
        item("critmval") / 100) *
      100,
    pierce: item("pierce") + skill("pierce"),
    armor: Math.round(item("ac") * (1 + skill("ac2_per") / 100)) + skill("ac"),
    evadePoints,
    evadeChance: Math.min(MAX_EVADE_OR_BLOCK_CHANCE, (evadePoints * 20) / lvl),
    blockPoints: blockItems + Math.round((skill("blok_per") * lvl) / 20),
    blockChance: Math.min(
      MAX_EVADE_OR_BLOCK_CHANCE,
      (blockItems * 20) / lvl + skill("blok_per"),
    ),
    absorb: Math.min(
      absorbLimit,
      Math.floor(item("absorb") * (1 + skill("absorb_per") / 100)),
    ),
    absorbMagic: Math.min(
      absorbLimit,
      Math.floor(item("absorbm") * (1 + skill("absorbm_per") / 100)),
    ),
    absorbLimit,
    resFire: resistance("resfire"),
    resFrost: resistance("resfrost"),
    resLight: resistance("reslight"),
    healing: Math.round(item("heal") * (1 + skill("heal1_per") / 100)),
    mana: Math.floor(
      item("manabon") + skill("manabon") + skill("manastr") * intellect,
    ),
    energy: Math.floor(BASE_ENERGY + item("energybon") + skill("energybon")),
  };
};
