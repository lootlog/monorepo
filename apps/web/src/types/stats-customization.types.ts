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
