import { PROFESSION_OPTIONS } from "@/lib/item-options";
import { EQUIPMENT_SLOTS, type EquipmentSlotId } from "@/lib/equipment-slots";

export type Profession = (typeof PROFESSION_OPTIONS)[number];

/** A character's equipment: who wears it and the item id in each slot. */
export type EquipmentSet = {
  profession: Profession | null;
  level: number | null;
  items: Partial<Record<EquipmentSlotId, number>>;
};

export const EMPTY_EQUIPMENT_SET: EquipmentSet = {
  profession: null,
  level: null,
  items: {},
};

/** The query parameter a shared set travels in. */
export const EQUIPMENT_SET_PARAM = "zestaw";

const MAX_LEVEL = 500;

const isProfession = (value: string): value is Profession =>
  PROFESSION_OPTIONS.some((profession) => profession === value);

/**
 * A set as a short, readable link value: the character first, then one
 * `<slot letter><item id>` per worn item, such as `h250_h12345_b678`. An
 * unknown character is `-`.
 */
export const encodeEquipmentSet = (set: EquipmentSet) =>
  [
    `${set.profession ?? "-"}${set.level ?? ""}`,
    ...EQUIPMENT_SLOTS.flatMap((slot) => {
      const itemId = set.items[slot.id];

      return itemId === undefined ? [] : [`${slot.code}${itemId}`];
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

  for (const part of parts) {
    const match = /^([a-z])(\d{1,12})$/.exec(part);
    const slot = EQUIPMENT_SLOTS.find(({ code }) => code === match?.[1]);

    if (match && slot) items[slot.id] = Number(match[2]);
  }

  return {
    profession: isProfession(profession) ? profession : null,
    level:
      Number.isInteger(level) && level > 0 && level <= MAX_LEVEL ? level : null,
    items,
  };
};
