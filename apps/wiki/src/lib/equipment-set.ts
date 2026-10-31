import { PROFESSION_OPTIONS } from "@/lib/item-options";
import { EQUIPMENT_SLOTS, type EquipmentSlotId } from "@/lib/equipment-slots";
import {
  type ItemUpgrade,
  isUpgradeBonusKey,
  isUpgradeLevel,
} from "@/lib/item-upgrade";

export type Profession = (typeof PROFESSION_OPTIONS)[number];

/**
 * A character's equipment: who wears it, the item id in each slot and how far
 * each worn item is upgraded, with its +5 bonus; a slot without an upgrade
 * wears it as dropped.
 */
export type EquipmentSet = {
  profession: Profession | null;
  level: number | null;
  items: Partial<Record<EquipmentSlotId, number>>;
  upgrades: Partial<Record<EquipmentSlotId, ItemUpgrade>>;
};

export const EMPTY_EQUIPMENT_SET: EquipmentSet = {
  profession: null,
  level: null,
  items: {},
  upgrades: {},
};

/** The query parameter a shared set travels in. */
export const EQUIPMENT_SET_PARAM = "set";

/** The parameter links shared before it was renamed still carry. */
export const LEGACY_EQUIPMENT_SET_PARAM = "zestaw";

const MAX_LEVEL = 500;

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

/**
 * A set as a short, readable link value: the character first, then one
 * `<slot letter><item id>` per worn item, with `u<level>` after an upgraded
 * one and the +5 bonus's stat after that, such as `h250_h12345u5ds_b678u2`.
 * An unknown character is `-`.
 */
export const encodeEquipmentSet = (set: EquipmentSet) =>
  [
    `${set.profession ?? "-"}${set.level ?? ""}`,
    ...EQUIPMENT_SLOTS.flatMap((slot) => {
      const itemId = set.items[slot.id];
      const upgrade = set.upgrades[slot.id];

      if (itemId === undefined) return [];

      const upgradePart = upgrade
        ? `u${upgrade.level}${upgrade.bonus ?? ""}`
        : "";

      return [`${slot.code}${itemId}${upgradePart}`];
    }),
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

  for (const part of parts) {
    const match = /^([a-z])(\d{1,12})(?:u(\d)([a-z]*))?$/.exec(part);
    const slot = EQUIPMENT_SLOTS.find(({ code }) => code === match?.[1]);
    const level = Number(match?.[3]);
    const bonus = match?.[4] ?? "";

    if (!match || !slot) continue;

    items[slot.id] = Number(match[2]);

    if (isUpgradeLevel(level) && level > 0) {
      upgrades[slot.id] =
        level === 5 && isUpgradeBonusKey(bonus) ? { level, bonus } : { level };
    }
  }

  return {
    profession: isProfession(profession) ? profession : null,
    level:
      Number.isInteger(level) && level > 0 && level <= MAX_LEVEL ? level : null,
    items,
    upgrades,
  };
};
