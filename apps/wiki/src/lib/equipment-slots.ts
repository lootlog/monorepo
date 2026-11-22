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
  code: string;
  types: readonly string[];
  position: string;
};

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

export const findEquipmentSlot = (type: string | null | undefined) =>
  EQUIPMENT_SLOTS.find(
    (slot) => type !== null && type !== undefined && slot.types.includes(type),
  );

export const findEquipmentSlotById = (id: string) =>
  EQUIPMENT_SLOTS.find((slot) => slot.id === id);

const SECONDARY_TYPES_BY_WEAPON = new Map<string, readonly string[]>([
  ["ONE_HAND_WEAPON", ["SHIELD", "HELP_WEAPON"]],
  ["ONE_AND_HALF_HAND_WEAPON", ["SHIELD"]],
  ["TWO_HAND_WEAPON", []],
  ["DISTANCE_WEAPON", ["QUIVER"]],
  ["WAND_WEAPON", ["ORB_WEAPON"]],
]);

type ItemTypeName = string | null | undefined;

export const secondaryTypesBeside = (weaponType: ItemTypeName) =>
  weaponType === null || weaponType === undefined
    ? undefined
    : SECONDARY_TYPES_BY_WEAPON.get(weaponType);

export const weaponTakesBothHands = (weaponType: ItemTypeName) =>
  secondaryTypesBeside(weaponType)?.length === 0;

export const handsFit = (
  weaponType: ItemTypeName,
  secondaryType: ItemTypeName,
) =>
  secondaryType === null ||
  secondaryType === undefined ||
  (secondaryTypesBeside(weaponType)?.includes(secondaryType) ?? true);
