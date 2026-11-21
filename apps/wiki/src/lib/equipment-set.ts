import { PROFESSION_OPTIONS } from "@/lib/item-options";
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

/**
 * A character's equipment: who wears it, the item id in each slot and how far
 * each worn item is upgraded, with its +5 bonus and the symbol in its socket;
 * a slot without an upgrade wears it as dropped. `skills` holds the rank of each learned skill of the
 * profession's tree, by the skill's id.
 */
export type EquipmentSet = {
  profession: Profession | null;
  level: number | null;
  items: Partial<Record<EquipmentSlotId, number>>;
  upgrades: Partial<Record<EquipmentSlotId, ItemUpgrade>>;
  skills: SkillRanks;
};

export const EMPTY_EQUIPMENT_SET: EquipmentSet = {
  profession: null,
  level: null,
  items: {},
  upgrades: {},
  skills: {},
};

const without = <Value>(
  record: Partial<Record<EquipmentSlotId, Value>>,
  slotId: EquipmentSlotId,
) => {
  const { [slotId]: _removed, ...rest } = record;

  return rest;
};

/** The set with the slot emptied. */
export const unequipSlot = (
  set: EquipmentSet,
  slotId: EquipmentSlotId,
): EquipmentSet => ({
  ...set,
  items: without(set.items, slotId),
  upgrades: without(set.upgrades, slotId),
});

/**
 * The set with the item worn in the slot its type belongs to. Without an
 * `upgrade`, an item already worn keeps its own and another is worn as
 * dropped. A weapon and the other hand's item that cannot be held together
 * do not stay together: the one already worn comes off. `typeOf` names the
 * type of a worn item by its id, as far as the catalog has loaded it.
 */
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

/** The query parameter a shared set travels in. */
export const EQUIPMENT_SET_PARAM = "set";

/** The parameter links shared before it was renamed still carry. */
export const LEGACY_EQUIPMENT_SET_PARAM = "zestaw";

export const MAX_CHARACTER_LEVEL = 500;

export const isCharacterLevel = (level: number) =>
  Number.isInteger(level) && level > 0 && level <= MAX_CHARACTER_LEVEL;

// One worn item: its slot letter, its id and its upgrade.
const SET_PART = new RegExp(`^([a-z])(\\d{1,12})${ITEM_UPGRADE_PATTERN}$`);

// One learned skill: its id and its rank.
const SKILL_PART = /^(\d{1,5})x(\d{1,2})$/;

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

/**
 * A set as a short, readable link value: the character first, then one
 * `<slot letter><item id>` per worn item, with `u<level>` after an upgraded
 * one and the +5 bonus's stat after that, `-` and the socket's symbol bonus
 * after a socketed one, then `<skill id>x<rank>` per learned skill, such as
 * `h250_h12345u5ds_b678u2-critred_168x10`. An unknown
 * character is `-`.
 */
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
  ].join("_");

/**
 * The set a link names. Parts it cannot read are dropped, so a mangled link
 * still opens as much of the set as it carries.
 */
export const decodeEquipmentSet = (value: string): EquipmentSet => {
  const [character = "", ...parts] = value.split("_");
  const characterMatch = /^([a-z-])(\d{0,3})$/.exec(character);
  const profession = characterMatch?.[1] ?? "";
  const level = Number(characterMatch?.[2]);

  const items: EquipmentSet["items"] = {};
  const upgrades: EquipmentSet["upgrades"] = {};
  const skills: SkillRanks = {};

  for (const part of parts) {
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
  };
};
