export interface CategoryCustomization {
  id: string;
  name: string;
  visible: boolean;
  statOrder: string[];
}

export interface StatsCustomizationConfig {
  categoryOrder: string[];
  categories: Record<string, CategoryCustomization>;
}

const DEFAULT_CATEGORY_IDS = [
  "turns",
  "damageDealt",
  "damageTaken",
  "turnsStats",
  "legendaryBonuses",
  "defenseDestruction",
  "defense",
  "healing",
  "resources",
] as const;

export type CategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];
