import { PROFESSION_OPTIONS } from "@/lib/item-options";
import {
  type BattleMastery,
  decodeBattleMastery,
  EMPTY_BATTLE_MASTERY,
  encodeBattleMastery,
} from "@/lib/skills/battle-mastery";
import type { SkillRanks } from "@/lib/skills/skill-tree";
import {
  EQUIPMENT_SLOTS,
  type EquipmentSlotId,
  findEquipmentSlot,
  handsFit,
} from "@/lib/equipment-slots";
import {
  decodeItemUpgrade,
  encodeItemUpgrade,
  isCrafted,
  type ItemUpgrade,
  ITEM_UPGRADE_PATTERN,
} from "@lootlog/domain/item-upgrade";

export type Profession = (typeof PROFESSION_OPTIONS)[number];

export type EquipmentSet = {
  profession: Profession | null;
  level: number | null;
  items: Partial<Record<EquipmentSlotId, number>>;
  upgrades: Partial<Record<EquipmentSlotId, ItemUpgrade>>;
  skills: SkillRanks;
  mastery: BattleMastery;
};

export const EMPTY_EQUIPMENT_SET: EquipmentSet = {
  profession: null,
  level: null,
  items: {},
  upgrades: {},
  skills: {},
  mastery: EMPTY_BATTLE_MASTERY,
};

const without = <Key extends PropertyKey, Value>(
  record: Partial<Record<Key, Value>>,
  key: Key,
) => {
  const { [key]: _removed, ...rest } = record;

  return rest;
};

export const unequipSlot = (
  set: EquipmentSet,
  slotId: EquipmentSlotId,
): EquipmentSet => ({
  ...set,
  items: without(set.items, slotId),
  upgrades: without(set.upgrades, slotId),
});

export const equipItem = (
  set: EquipmentSet,
  item: { id: number; type: string | null },
  upgrade: ItemUpgrade | undefined,
  typeOf: (itemId: number) => string | null | undefined,
): EquipmentSet => {
  const slot = findEquipmentSlot(item.type);

  if (!slot) return set;

  const otherHand =
    slot.id === "weapon"
      ? "secondary"
      : slot.id === "secondary"
        ? "weapon"
        : undefined;

  const otherId = otherHand ? set.items[otherHand] : undefined;
  const otherType = otherId === undefined ? undefined : typeOf(otherId);

  const fits =
    slot.id === "weapon"
      ? handsFit(item.type, otherType)
      : handsFit(otherType, item.type);

  const kept = otherHand && !fits ? unequipSlot(set, otherHand) : set;

  const nextUpgrade =
    upgrade ??
    (set.items[slot.id] === item.id ? set.upgrades[slot.id] : undefined);

  const upgrades = without(kept.upgrades, slot.id);

  return {
    ...kept,
    items: { ...kept.items, [slot.id]: item.id },
    upgrades:
      nextUpgrade && isCrafted(nextUpgrade)
        ? { ...upgrades, [slot.id]: nextUpgrade }
        : upgrades,
  };
};

export const upgradeSlot = (
  set: EquipmentSet,
  slotId: EquipmentSlotId,
  upgrade: ItemUpgrade,
): EquipmentSet => {
  if (set.items[slotId] === undefined) return set;

  const upgrades = without(set.upgrades, slotId);

  return {
    ...set,
    upgrades: isCrafted(upgrade)
      ? { ...upgrades, [slotId]: upgrade }
      : upgrades,
  };
};

export const rankSkill = (
  set: EquipmentSet,
  skillId: number,
  rank: number,
): EquipmentSet => {
  const skills = without(set.skills, skillId);

  return { ...set, skills: rank > 0 ? { ...skills, [skillId]: rank } : skills };
};

export const EQUIPMENT_SET_PARAM = "set";

export const LEGACY_EQUIPMENT_SET_PARAM = "zestaw";

export const MAX_CHARACTER_LEVEL = 500;

export const isCharacterLevel = (level: number) =>
  Number.isInteger(level) && level > 0 && level <= MAX_CHARACTER_LEVEL;

const SET_PART = new RegExp(`^([a-z])(\\d{1,12})${ITEM_UPGRADE_PATTERN}$`);

const SKILL_PART = /^(\d{1,5})x(\d{1,2})$/;

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

export const encodeEquipmentSet = (set: EquipmentSet) =>
  [
    `${set.profession ?? "-"}${set.level ?? ""}`,
    ...EQUIPMENT_SLOTS.flatMap((slot) => {
      const itemId = set.items[slot.id];
      const upgrade = set.upgrades[slot.id];

      if (itemId === undefined) return [];

      return [`${slot.code}${itemId}${encodeItemUpgrade(upgrade)}`];
    }),
    ...Object.entries(set.skills)
      .filter(([, rank = 0]) => rank > 0)
      .map(([id, rank]) => `${id}x${rank}`),
    ...encodeBattleMastery(set.mastery),
  ].join("_");

export const decodeEquipmentSet = (value: string): EquipmentSet => {
  const [character = "", ...parts] = value.split("_");
  const characterMatch = /^([a-z-])(\d{0,3})$/.exec(character);
  const profession = characterMatch?.[1] ?? "";
  const level = Number(characterMatch?.[2]);

  const items: EquipmentSet["items"] = {};
  const upgrades: EquipmentSet["upgrades"] = {};
  const skills: SkillRanks = {};
  let mastery = EMPTY_BATTLE_MASTERY;

  for (const part of parts) {
    const decodedMastery = decodeBattleMastery(part);

    if (decodedMastery) {
      mastery = decodedMastery;
      continue;
    }

    const skill = SKILL_PART.exec(part);

    if (skill && Number(skill[2]) > 0) {
      skills[Number(skill[1])] = Number(skill[2]);
      continue;
    }

    const match = SET_PART.exec(part);
    const slot = EQUIPMENT_SLOTS.find(({ code }) => code === match?.[1]);

    if (!match || !slot) continue;

    items[slot.id] = Number(match[2]);

    const upgrade = decodeItemUpgrade(match[3], match[4], match[5]);

    if (upgrade) upgrades[slot.id] = upgrade;
  }

  return {
    profession: isProfession(profession) ? profession : null,
    level: isCharacterLevel(level) ? level : null,
    items,
    upgrades,
    skills,
    mastery,
  };
};
