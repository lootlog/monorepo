import {
  CircleDot,
  Footprints,
  Gem,
  Hand,
  HardHat,
  type LucideIcon,
  Shield,
  Shirt,
  Sword,
} from "lucide-react";

export type EquipmentSlotId =
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
  icon: LucideIcon;
  /** Item types the slot holds. */
  types: readonly string[];
  /** Where the slot sits in Margonem's equipment grid. */
  position: string;
};

/**
 * Margonem's equipment, laid out as the game draws it: the helmet on top,
 * ring, necklace and gloves under it, then weapon, armor and the secondary
 * hand, and boots at the bottom. The bag is not equipment and has no slot.
 */
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = [
  {
    id: "helmet",
    code: "h",
    icon: HardHat,
    types: ["HELMET"],
    position: "col-start-2 row-start-1",
  },
  {
    id: "ring",
    code: "r",
    icon: CircleDot,
    types: ["RING"],
    position: "col-start-1 row-start-2",
  },
  {
    id: "necklace",
    code: "n",
    icon: Gem,
    types: ["NECKLACE"],
    position: "col-start-2 row-start-2",
  },
  {
    id: "gloves",
    code: "g",
    icon: Hand,
    types: ["GLOVES"],
    position: "col-start-3 row-start-2",
  },
  {
    id: "weapon",
    code: "w",
    icon: Sword,
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
    icon: Shirt,
    types: ["ARMOR"],
    position: "col-start-2 row-start-3",
  },
  {
    id: "secondary",
    code: "s",
    icon: Shield,
    types: ["SHIELD", "HELP_WEAPON", "ORB_WEAPON"],
    position: "col-start-3 row-start-3",
  },
  {
    id: "boots",
    code: "b",
    icon: Footprints,
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
