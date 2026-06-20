import type { BattleWarrior as Warrior } from "@/lib/api/battlelog-types";

export interface BattleStatDefinition {
  key: keyof Warrior;
  labelKey: string;
  color?: string;
  format?: (value: unknown) => string;
}

export interface BattleStatCategoryDefinition {
  id: CategoryId;
  labelKey: string;
  stats: BattleStatDefinition[];
}

export interface CategoryCustomization {
  id: string;
  name?: string;
  visible: boolean;
  statOrder: string[];
}

export interface StatsCustomizationConfig {
  categoryOrder: string[];
  categories: Record<string, CategoryCustomization>;
}

const DEFAULT_CATEGORY_IDS = [
  "turnStats",
  "damageDealt",
  "damageTaken",
  "turns",
  "legendaryBonuses",
  "defenseDestroy",
  "defense",
  "healing",
  "resources",
] as const;

export type CategoryId = (typeof DEFAULT_CATEGORY_IDS)[number];
