import {
  parseItemStatEntries,
  resistedEnergyDestruction,
} from "@lootlog/domain/item-stat";
import type { Profession } from "@/lib/equipment-set";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import type { SkillBonuses } from "@/lib/skills/skill-stats";
import { SKILL_LEVEL_CAP } from "@/lib/skills/skill-tree";

type Attributes = { strength: number; agility: number; intellect: number };

type AttributeGains = { odd: Attributes; even: Attributes };

const gain = (strength: number, agility: number, intellect: number) => ({
  strength,
  agility,
  intellect,
});

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

const ATTRIBUTE_CRIT_FROM_LEVEL = 21;

const ATTRIBUTE_CRIT_LEVEL_CAP = 300;

const cappedLevel = (level: number) =>
  Math.min(SKILL_LEVEL_CAP, Math.max(1, Math.floor(level)));

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

type DamageRange = { min: number; max: number };

type ChanceDamage = { chance: number; damage: number };

type SlowingDamage = { slow: number; damage: number };

type ResourcePair = { mana: number; energy: number };

export type CharacterStats = {
  hp: number;
  strength: number;
  agility: number;
  intellect: number;
  physical: DamageRange;
  offhand: DamageRange;
  fire: DamageRange;
  frost: DamageRange;
  frostSlow: number;
  light: DamageRange;
  poison: SlowingDamage;
  wound: ChanceDamage;
  offhandPoison: SlowingDamage;
  offhandWound: ChanceDamage;
  attackSpeed: number;
  critChance: number;
  critValue: number;
  critMagicValue: number;
  offhandCritChance: number;
  offhandCritValue: number;
  pierce: number;
  armor: number;
  evadePoints: number;
  evadeItemPoints: number;
  evadeChance: number;
  blockPoints: number;
  blockItemPoints: number;
  blockChance: number;
  absorb: number;
  absorbMagic: number;
  absorbLimit: number;
  resFire: number;
  resFrost: number;
  resLight: number;
  healing: number;
  healingItem: number;
  mana: number;
  energy: number;
  physicalBonus: number;
  evadeReduction: number;
  evadeItemReduction: number;
  critReduction: number;
  critValueReduction: number;
  armorDestruction: number;
  armorDestructionResist: number;
  absorbDestruction: number;
  resistanceDestruction: number;
  pierceBlock: number;
  resistPoison: number;
  resistWound: number;
  counterChance: number;
  parryChance: number;
  enemyHealingCut: number;
  drainResist: ResourcePair;
};

type WornItem = { item: { type: string | null; stat: string } };

const NUMBER_LIST = /^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)*$/;

const statNumbers = (value: string | boolean) =>
  NUMBER_LIST.test(String(value)) ? String(value).split(",").map(Number) : [];

type ItemSums = {
  flat: Map<string, number>;
  mainDamage: DamageRange;
  offhandDamage: DamageRange;
  mainCrit: number;
  offhandCrit: number;
  sharedCrit: number;
  mainCritValue: number;
  offhandCritValue: number;
  sharedCritValue: number;
  fire: DamageRange;
  frost: SlowingDamage;
  light: DamageRange;
  poison: SlowingDamage;
  wound: ChanceDamage;
  offhandPoison: SlowingDamage;
  offhandWound: ChanceDamage;
  drainResist: ResourcePair;
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

const slowingDamage = (numbers: readonly number[]): SlowingDamage => ({
  slow: numbers.length > 1 ? Math.max(0, numbers[0] ?? 0) : 0,
  damage: Math.max(0, numbers.at(-1) ?? 0),
});

type AddEntry = (
  sums: ItemSums,
  numbers: readonly number[],
  isOffhand: boolean,
) => void;

const DAMAGE_ENTRIES = new Map(
  Object.entries({
    dmg: (sums, numbers, isOffhand) => {
      if (isOffhand) {
        sums.offhandDamage = addRange(sums.offhandDamage, range(numbers));
      } else {
        sums.mainDamage = addRange(sums.mainDamage, range(numbers));
      }
    },
    fire: (sums, numbers) => {
      sums.fire = addRange(sums.fire, range(numbers));
    },
    light: (sums, numbers) => {
      sums.light = addRange(sums.light, range(numbers));
    },
    frost: (sums, numbers) => {
      const effect = slowingDamage(numbers);

      sums.frost = {
        slow: Math.max(sums.frost.slow, effect.slow),
        damage: sums.frost.damage + effect.damage,
      };
    },
    poison: (sums, numbers, isOffhand) => {
      const effect = slowingDamage(numbers);
      const weapon = isOffhand ? "offhandPoison" : "poison";

      sums[weapon] = {
        slow: Math.max(sums[weapon].slow, effect.slow),
        damage: sums[weapon].damage + effect.damage,
      };
    },
    wound: (sums, numbers, isOffhand) => {
      const effect = chanceDamage(numbers);
      const weapon = isOffhand ? "offhandWound" : "wound";

      sums[weapon] = {
        chance: sums[weapon].chance + effect.chance,
        damage: sums[weapon].damage + effect.damage,
      };
    },
    resmanaendest: (sums, [mana = 0]) => {
      sums.drainResist = {
        mana: sums.drainResist.mana + mana,
        energy:
          sums.drainResist.energy +
          (mana > 0 ? resistedEnergyDestruction(mana) : 0),
      };
    },
  } satisfies Record<string, AddEntry>),
);

type CritOwner = "main" | "offhand" | "shared";

const CRIT_SUMS = {
  main: { crit: "mainCrit", critval: "mainCritValue" },
  offhand: { crit: "offhandCrit", critval: "offhandCritValue" },
  shared: { crit: "sharedCrit", critval: "sharedCritValue" },
} as const;

const addSingleValue = (
  sums: ItemSums,
  key: string,
  value: number,
  owner: CritOwner,
) => {
  if (key === "crit" || key === "critval") {
    sums[CRIT_SUMS[owner][key]] += value;
  } else {
    sums.flat.set(key, (sums.flat.get(key) ?? 0) + value);
  }
};

const UNSHIELDED_ONE_AND_HALF_HAND_DAMAGE = 1.22;

const sumItems = (wornItems: readonly WornItem[]): ItemSums => {
  const sums: ItemSums = {
    flat: new Map(),
    mainDamage: { min: 0, max: 0 },
    offhandDamage: { min: 0, max: 0 },
    mainCrit: 0,
    offhandCrit: 0,
    sharedCrit: 0,
    mainCritValue: 0,
    offhandCritValue: 0,
    sharedCritValue: 0,
    fire: { min: 0, max: 0 },
    frost: { slow: 0, damage: 0 },
    light: { min: 0, max: 0 },
    poison: { slow: 0, damage: 0 },
    wound: { chance: 0, damage: 0 },
    offhandPoison: { slow: 0, damage: 0 },
    offhandWound: { chance: 0, damage: 0 },
    drainResist: { mana: 0, energy: 0 },
  };

  const shielded = wornItems.some(({ item }) => item.type === "SHIELD");

  for (const { item } of wornItems) {
    const isOffhand = item.type === "HELP_WEAPON";

    const damageScale =
      item.type === "ONE_AND_HALF_HAND_WEAPON" && !shielded
        ? UNSHIELDED_ONE_AND_HALF_HAND_DAMAGE
        : 1;

    const critOwner = isOffhand
      ? "offhand"
      : findEquipmentSlot(item.type)?.id === "weapon"
        ? "main"
        : "shared";

    for (const { key, value } of parseItemStatEntries(item.stat)) {
      const numbers = statNumbers(value);
      const addDamage = DAMAGE_ENTRIES.get(key);
      const [single] = numbers;

      if (addDamage && numbers.length > 0) {
        addDamage(
          sums,
          key === "dmg"
            ? numbers.map((number) => number * damageScale)
            : numbers,
          isOffhand,
        );
      } else if (numbers.length === 1 && single !== undefined) {
        addSingleValue(sums, key, single, critOwner);
      }
    }
  }

  return sums;
};

export const MAX_RESISTANCE = 90;

const MAX_EVADE_OR_BLOCK_CHANCE = 50;

const BASE_CRIT_MULTIPLIER = 1.2;

const BASE_ENERGY = 50;

const ELEMENT_SPREAD = 0.2;

const LIGHT_MIN_BONUS_SHARE = 0.67;

const elementalDamage = (
  { min, max }: DamageRange,
  attributeBonus: number,
  multiplier: number,
  spread: number,
  minBonusShare = 1,
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
    min: Math.round((min + minBonusShare * attributeBonus) * multiplier),
    max: Math.round((max + attributeBonus) * multiplier),
  };
};

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

  const damageMultiplier = (kind: string) =>
    1 + (item("dmgmul") + item(`dmgmul${kind}`)) / 100;

  const physicalMultiplier = damageMultiplier("physical");

  const round = profession === "b" ? Math.floor : Math.round;

  const attributeDamage =
    agility * skill("agi") + strength * (skill("str1h") + skill("str2h"));

  const unarmed = Math.max(1, Math.floor(lvl / 4) - 1);

  const physicalAttack = attributeDamage + item("pdmg");

  const physicalMin = round(
    (items.mainDamage.min + physicalAttack) * physicalMultiplier,
  );

  const physicalMax = round(
    (items.mainDamage.max + physicalAttack) * physicalMultiplier,
  );

  const isArmed = wornItems.some(
    ({ item }) => findEquipmentSlot(item.type)?.id === "weapon",
  );

  const physical =
    physicalMin > 0
      ? { min: physicalMin, max: physicalMax }
      : isArmed
        ? { min: 0, max: 0 }
        : { min: unarmed, max: unarmed };

  const offhandBonus = strength * skill("of-str");

  const poisonOf = (weapon: SlowingDamage): SlowingDamage => ({
    slow: weapon.slow / 100,
    damage: Math.round(weapon.damage * damageMultiplier("poison")),
  });

  const woundOf = (weapon: ChanceDamage, bonusKey: string) => ({
    chance: weapon.chance + skill("woundchance"),
    damage: Math.round(
      weapon.damage * damageMultiplier("wound") * (1 + skill(bonusKey) / 100),
    ),
  });

  const attributeCrit = (points: number) =>
    lvl >= ATTRIBUTE_CRIT_FROM_LEVEL
      ? points / (0.5 * Math.min(lvl, ATTRIBUTE_CRIT_LEVEL_CAP)) / 100
      : 0;

  const baseCrit = 1 + 0.02 * lvl;
  const absorbLimit = intellect * 7;

  const evadeItemPoints = Math.round(agility / 30) + Math.floor(item("evade"));

  const evadePoints =
    evadeItemPoints + Math.round((skill("evade_per") * lvl) / 20);

  const blockItems = Math.floor(item("blok"));

  const resistance = (key: string) => Math.max(0, item(key) + skill(key));

  return {
    hp,
    strength,
    agility,
    intellect,
    physical,
    offhand: {
      min: round((items.offhandDamage.min + offhandBonus) * physicalMultiplier),
      max: round((items.offhandDamage.max + offhandBonus) * physicalMultiplier),
    },
    fire: elementalDamage(
      items.fire,
      intellect * skill("firebon"),
      damageMultiplier("fire"),
      ELEMENT_SPREAD,
    ),
    frost: elementalDamage(
      { min: items.frost.damage, max: items.frost.damage },
      intellect * skill("frostbon"),
      damageMultiplier("frost"),
      0,
    ),
    frostSlow: items.frost.slow / 100,
    light: elementalDamage(
      items.light,
      intellect * skill("lightbon"),
      damageMultiplier("light"),
      ELEMENT_SPREAD,
      LIGHT_MIN_BONUS_SHARE,
    ),
    poison: poisonOf(items.poison),
    wound: woundOf(items.wound, "wounddmgbon_perw"),
    offhandPoison: poisonOf(items.offhandPoison),
    offhandWound: woundOf(items.offhandWound, "of-wounddmgbon_perw"),
    attackSpeed,
    critChance: baseCrit + items.mainCrit + items.sharedCrit + skill("crit"),
    critValue:
      (BASE_CRIT_MULTIPLIER +
        attributeCrit(strength) +
        (items.mainCritValue + items.sharedCritValue) / 100 +
        skill("critval") / 100) *
      100,
    offhandCritChance:
      baseCrit +
      items.offhandCrit +
      items.sharedCrit +
      skill("crit") +
      skill("of-crit"),
    offhandCritValue:
      (BASE_CRIT_MULTIPLIER +
        attributeCrit(strength) +
        (items.offhandCritValue + items.sharedCritValue) / 100 +
        skill("of-critval") / 100) *
      100,
    critMagicValue:
      (BASE_CRIT_MULTIPLIER +
        attributeCrit(intellect) +
        item("critmval") / 100) *
      100,
    pierce: item("pierce") + skill("pierce"),
    armor: Math.round(
      (item("ac") + skill("ac")) * (1 + skill("ac2_per") / 100),
    ),
    evadePoints,
    evadeItemPoints,
    evadeChance: Math.min(MAX_EVADE_OR_BLOCK_CHANCE, (evadePoints * 20) / lvl),
    blockPoints: blockItems + Math.round((skill("blok_per") * lvl) / 20),
    blockItemPoints: blockItems,
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
    healing: Math.round(
      Math.max(0, item("heal") - item("adest")) *
        (1 + skill("heal1_per") / 100),
    ),
    healingItem: Math.max(0, item("heal") - item("adest")),
    mana: Math.floor(
      item("manabon") + skill("manabon") + skill("manastr") * intellect,
    ),
    energy: Math.floor(BASE_ENERGY + item("energybon") + skill("energybon")),
    physicalBonus: item("dmgmulphysical"),
    evadeReduction:
      item("lowevade") + Math.round((skill("decevade_per") * lvl) / 20),
    evadeItemReduction: item("lowevade"),
    critReduction: item("lowcrit"),
    critValueReduction: item("lowcritallval"),
    armorDestruction: item("acdmg") + skill("acdmg"),
    armorDestructionResist: item("resacdmg"),
    absorbDestruction: item("abdest"),
    resistanceDestruction: item("resdmg") + skill("resdmg"),
    pierceBlock: item("pierceb") + skill("pierceb"),
    resistPoison: item("act") + skill("act"),
    resistWound: item("woundred") + skill("woundred"),
    counterChance: item("contra") + skill("contra"),
    parryChance: item("parry") + skill("parry"),
    enemyHealingCut: item("lowheal2turns"),
    drainResist: items.drainResist,
  };
};
