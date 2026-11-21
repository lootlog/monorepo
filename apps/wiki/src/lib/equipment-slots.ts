export type EquipmentSlotId =
  | "blessing"
  | "helmet"
  | "ring"
  | "necklace"
  | "gloves"
  | "weapon"
  | "armor"
  | "secondary"
  | "boots";

export type EquipmentSlot = {
  id: EquipmentSlotId;
  /** One letter in a shared set link. */
  code: string;
  /** Item types the slot holds. */
  types: readonly string[];
  /** Where the slot sits in Margonem's equipment grid. */
  position: string;
};

/**
 * Margonem's equipment, laid out as the game draws it: the blessing and the
 * helmet on top, ring, necklace and gloves under them, then weapon, armor and
 * the secondary hand, and boots at the bottom. The bag is not equipment and
 * has no slot.
 */
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  {
    id: "blessing",
    code: "l",
    types: ["BLESS"],
    position: "col-start-1 row-start-1",
  },
  {
    id: "helmet",
    code: "h",
    types: ["HELMET"],
    position: "col-start-2 row-start-1",
  },
  {
    id: "ring",
    code: "r",
    types: ["RING"],
    position: "col-start-1 row-start-2",
  },
  {
    id: "necklace",
    code: "n",
    types: ["NECKLACE"],
    position: "col-start-2 row-start-2",
  },
  {
    id: "gloves",
    code: "g",
    types: ["GLOVES"],
    position: "col-start-3 row-start-2",
  },
  {
    id: "weapon",
    code: "w",
    types: [
      "ONE_HAND_WEAPON",
      "TWO_HAND_WEAPON",
      "ONE_AND_HALF_HAND_WEAPON",
      "DISTANCE_WEAPON",
      "WAND_WEAPON",
    ],
    position: "col-start-1 row-start-3",
  },
  {
    id: "armor",
    code: "a",
    types: ["ARMOR"],
    position: "col-start-2 row-start-3",
  },
  {
    id: "secondary",
    code: "s",
    types: ["SHIELD", "HELP_WEAPON", "ORB_WEAPON", "QUIVER"],
    position: "col-start-3 row-start-3",
  },
  {
    id: "boots",
    code: "b",
    types: ["BOOTS"],
    position: "col-start-2 row-start-4",
  },
];

/** The slot an item of this type is worn in; none for bags, potions and the rest. */
export const findEquipmentSlot = (type: string | null | undefined) =>
  EQUIPMENT_SLOTS.find(
    (slot) => type !== null && type !== undefined && slot.types.includes(type),
  );

export const findEquipmentSlotById = (id: string) =>
  EQUIPMENT_SLOTS.find((slot) => slot.id === id);

/**
 * What the other hand may hold beside each weapon type: a shield or a helper
 * blade beside a one-handed weapon, arrows beside a bow, an orb beside a
 * wand, and nothing beside a two-handed weapon.
 */
const SECONDARY_TYPES_BY_WEAPON = new Map<string, readonly string[]>([
  ["ONE_HAND_WEAPON", ["SHIELD", "HELP_WEAPON"]],
  ["ONE_AND_HALF_HAND_WEAPON", ["SHIELD"]],
  ["TWO_HAND_WEAPON", []],
  ["DISTANCE_WEAPON", ["QUIVER"]],
  ["WAND_WEAPON", ["ORB_WEAPON"]],
]);

type ItemTypeName = string | null | undefined;

/** What the other hand may hold beside the weapon; unknown for a type the table lacks. */
export const secondaryTypesBeside = (weaponType: ItemTypeName) =>
  weaponType === null || weaponType === undefined
    ? undefined
    : SECONDARY_TYPES_BY_WEAPON.get(weaponType);

/** Whether the weapon leaves the other hand free for nothing at all. */
export const weaponTakesBothHands = (weaponType: ItemTypeName) =>
  secondaryTypesBeside(weaponType)?.length === 0;

/**
 * Whether a character can hold both items at once. A type the table does not
 * know fits, so an unknown item is never taken off.
 */
export const handsFit = (
  weaponType: ItemTypeName,
  secondaryType: ItemTypeName,
) =>
  secondaryType === null ||
  secondaryType === undefined ||
  (secondaryTypesBeside(weaponType)?.includes(secondaryType) ?? true);
