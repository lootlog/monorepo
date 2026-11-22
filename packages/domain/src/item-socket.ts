import { orderBy, sortBy } from "es-toolkit";
import { getItemTypeByCl } from "./item-type.js";
import {
  hasItemStat,
  itemStatValue,
  parseItemStatEntries,
} from "./item-stat.js";

export const SOCKET_BONUSES = [
  "verycrit",
  "curse",
  "glare",
  "holytouch",
  "critred",
  "lastheal",
  "facade",
  "cleanse",
  "anguish",
  "puncture",
] as const;

export type SocketBonus = (typeof SOCKET_BONUSES)[number];

export const isSocketBonus = (value: string): value is SocketBonus =>
  SOCKET_BONUSES.some((bonus) => bonus === value);

const COMPONENT_ELEMENTS = [
  "steel",
  "fire",
  "frost",
  "light",
  "venom",
] as const;

type ComponentElement = (typeof COMPONENT_ELEMENTS)[number];

const SYMBOL_RECIPES: Record<SocketBonus, readonly ComponentElement[]> = {
  verycrit: ["fire", "fire", "frost"],
  curse: ["steel", "frost", "venom"],
  glare: ["frost", "light", "light"],
  holytouch: ["fire", "light", "venom"],
  critred: ["steel", "venom", "venom"],
  lastheal: ["steel", "fire", "light"],
  facade: ["fire", "frost", "venom"],
  cleanse: ["steel", "frost", "light"],
  anguish: ["frost", "light", "venom"],
  puncture: ["steel", "steel", "fire"],
};

export type SymbolTier = {
  minLevel: number;
  maxLevel: number;
  components: Record<ComponentElement, number>;
  symbols: Record<SocketBonus, number>;
  chests: {
    universal: number;
    elements: Record<ComponentElement, number>;
    double: number;
  };
};

export const SYMBOL_TIERS: readonly SymbolTier[] = [
  {
    minLevel: 20,
    maxLevel: 100,
    components: {
      steel: 54331,
      fire: 54332,
      frost: 54333,
      light: 54334,
      venom: 54335,
    },
    symbols: {
      verycrit: 54346,
      curse: 54347,
      glare: 54348,
      holytouch: 54349,
      critred: 54350,
      lastheal: 54351,
      facade: 54352,
      cleanse: 54353,
      anguish: 54354,
      puncture: 54356,
    },
    chests: {
      universal: 59447,
      elements: {
        steel: 59448,
        fire: 59449,
        frost: 59450,
        light: 59451,
        venom: 59452,
      },
      double: 63696,
    },
  },
  {
    minLevel: 101,
    maxLevel: 200,
    components: {
      steel: 54336,
      fire: 54337,
      frost: 54338,
      light: 54339,
      venom: 54340,
    },
    symbols: {
      verycrit: 57473,
      curse: 57474,
      glare: 57475,
      holytouch: 57476,
      critred: 57477,
      lastheal: 57478,
      facade: 57479,
      cleanse: 57480,
      anguish: 57481,
      puncture: 57483,
    },
    chests: {
      universal: 59455,
      elements: {
        steel: 59458,
        fire: 59459,
        frost: 59460,
        light: 59461,
        venom: 59462,
      },
      double: 63697,
    },
  },
  {
    minLevel: 201,
    maxLevel: 300,
    components: {
      steel: 54341,
      fire: 54342,
      frost: 54343,
      light: 54344,
      venom: 54345,
    },
    symbols: {
      verycrit: 57485,
      curse: 57486,
      glare: 57487,
      holytouch: 57488,
      critred: 57489,
      lastheal: 57490,
      facade: 57491,
      cleanse: 57492,
      anguish: 57493,
      puncture: 57495,
    },
    chests: {
      universal: 59492,
      elements: {
        steel: 59493,
        fire: 59494,
        frost: 59496,
        light: 59497,
        venom: 59498,
      },
      double: 63698,
    },
  },
];

const COMPONENT_RARITY_FACTOR = 1000;

export const fusionGoldCost = (tier: Pick<SymbolTier, "maxLevel">) =>
  5 * (10 * tier.maxLevel + 1300) * tier.maxLevel * COMPONENT_RARITY_FACTOR;

export type ComponentChest = {
  id: number;
  tier: SymbolTier;
  element: ComponentElement | undefined;
  components: number;
};

const OWN_ELEMENT_CHANCE = 0.5;

export const tierChests = (tier: SymbolTier): ComponentChest[] => [
  { id: tier.chests.universal, tier, element: undefined, components: 1 },
  ...COMPONENT_ELEMENTS.map((element) => ({
    id: tier.chests.elements[element],
    tier,
    element,
    components: 1,
  })),
  { id: tier.chests.double, tier, element: undefined, components: 2 },
];

export const findChest = (itemId: number): ComponentChest | undefined =>
  SYMBOL_TIERS.flatMap(tierChests).find((chest) => chest.id === itemId);

export type ChestComponent = {
  element: ComponentElement;
  id: number;
  chance: number;
};

export const chestComponents = (chest: ComponentChest): ChestComponent[] =>
  orderBy(
    COMPONENT_ELEMENTS.map((element) => ({
      element,
      id: chest.tier.components[element],
      chance:
        chest.element === undefined
          ? 1 / COMPONENT_ELEMENTS.length
          : element === chest.element
            ? OWN_ELEMENT_CHANCE
            : (1 - OWN_ELEMENT_CHANCE) / (COMPONENT_ELEMENTS.length - 1),
    })),
    [({ chance }) => chance],
    ["desc"],
  );

export type RecipeComponent = {
  element: ComponentElement;
  id: number;
  count: number;
};

export const symbolRecipe = (
  tier: SymbolTier,
  bonus: SocketBonus,
): RecipeComponent[] =>
  COMPONENT_ELEMENTS.flatMap((element) => {
    const count = SYMBOL_RECIPES[bonus].filter(
      (needed) => needed === element,
    ).length;

    return count > 0 ? [{ element, id: tier.components[element], count }] : [];
  });

export type SymbolInfo = {
  tier: SymbolTier;
  bonus: SocketBonus;
  recipe: RecipeComponent[];
};

export const findSymbol = (itemId: number): SymbolInfo | undefined => {
  for (const tier of SYMBOL_TIERS) {
    const bonus = SOCKET_BONUSES.find((name) => tier.symbols[name] === itemId);

    if (bonus) {
      return {
        tier,
        bonus,
        recipe: symbolRecipe(tier, bonus),
      };
    }
  }

  return undefined;
};

export type ComponentInfo = { tier: SymbolTier; element: ComponentElement };

export const findComponent = (itemId: number): ComponentInfo | undefined => {
  for (const tier of SYMBOL_TIERS) {
    const element = COMPONENT_ELEMENTS.find(
      (name) => tier.components[name] === itemId,
    );

    if (element) return { tier, element };
  }

  return undefined;
};

type SocketedItem = { stat: string; lvl: number; type: string | null };

export const hasSocket = (item: Pick<SocketedItem, "stat">) =>
  hasItemStat(item.stat, "socket_content");

type CatalogSymbol = { id: number; stat: string };

const symbolFits = (
  symbol: Pick<CatalogSymbol, "stat">,
  item: SocketedItem,
) => {
  const classes = (itemStatValue(symbol.stat, "target_class") ?? "")
    .split(",")
    .map(Number);

  const minLevel = Number(itemStatValue(symbol.stat, "target_min_lvl") ?? 0);

  const maxLevel = Number(
    itemStatValue(symbol.stat, "target_max_lvl") ?? Number.POSITIVE_INFINITY,
  );

  return (
    hasSocket(item) &&
    item.lvl >= minLevel &&
    item.lvl <= maxLevel &&
    classes.some((cl) => getItemTypeByCl(cl) === item.type)
  );
};

export type SocketOption = { bonus: SocketBonus; symbolId: number };

export const socketOptions = (
  item: SocketedItem,
  symbols: readonly CatalogSymbol[],
): SocketOption[] =>
  sortBy(
    symbols.flatMap((symbol) => {
      const bonus = itemStatValue(symbol.stat, "legbon")?.split(",")[0] ?? "";

      return isSocketBonus(bonus) && symbolFits(symbol, item)
        ? [{ bonus, symbolId: symbol.id }]
        : [];
    }),
    [({ bonus }) => SOCKET_BONUSES.indexOf(bonus)],
  );

const SOCKET_BONUS_STATS = new Set([
  "socket_injection_legbon",
  "socket_fleeting_legbon",
]);

export const socketItemStat = (
  stat: string,
  bonus: SocketBonus,
  level: number,
) => {
  if (!hasItemStat(stat, "socket_content")) return stat;

  return [
    ...parseItemStatEntries(stat).flatMap(({ key, value }) => {
      if (SOCKET_BONUS_STATS.has(key)) return [];

      if (key === "socket_content") return ["socket_content=1"];

      return [value === true ? key : `${key}=${value}`];
    }),
    `socket_injection_legbon=${bonus},${level}`,
  ].join(";");
};
