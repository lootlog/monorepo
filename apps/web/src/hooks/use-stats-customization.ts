import { useLocalStorage } from "usehooks-ts";
import type {
  CategoryCustomization,
  BattleStatCategoryDefinition,
  StatsCustomizationConfig,
} from "@/types/stats-customization.types";

const STORAGE_KEY = "lootlog-battle-stats-customization-v2";

const createDefaultConfig = (
  categories: BattleStatCategoryDefinition[],
): StatsCustomizationConfig => {
  const categoryOrder = categories.map((category) => category.id);
  const categoriesMap: Record<string, CategoryCustomization> = {};

  for (const category of categories) {
    categoriesMap[category.id] = {
      id: category.id,
      visible: true,
      statOrder: category.stats.map((stat) => String(stat.key)),
    };
  }

  return {
    categoryOrder,
    categories: categoriesMap,
  };
};

export const useStatsCustomization = (
  defaultCategories: BattleStatCategoryDefinition[],
) => {
  const [config, setConfig] = useLocalStorage<StatsCustomizationConfig>(
    STORAGE_KEY,
    createDefaultConfig(defaultCategories),
  );

  const updateCategoryOrder = (newOrder: string[]) => {
    setConfig((prev) => ({
      ...prev,
      categoryOrder: newOrder,
    }));
  };

  const updateCategory = (
    categoryId: string,
    update: (category: CategoryCustomization) => CategoryCustomization,
  ) => {
    setConfig((previous) => {
      const category = previous.categories[categoryId];
      if (!category) return previous;
      const updated = update(category);
      if (updated === category) return previous;
      return {
        ...previous,
        categories: { ...previous.categories, [categoryId]: updated },
      };
    });
  };

  const toggleCategoryVisibility = (categoryId: string) =>
    updateCategory(categoryId, (category) => ({
      ...category,
      visible: !category.visible,
    }));
  const updateCategoryName = (categoryId: string, name: string) =>
    updateCategory(categoryId, (category) => ({ ...category, name }));
  const updateStatOrder = (categoryId: string, statOrder: string[]) =>
    updateCategory(categoryId, (category) => ({ ...category, statOrder }));
  const addStatToCategory = (categoryId: string, statKey: string) =>
    updateCategory(categoryId, (category) =>
      category.statOrder.includes(statKey)
        ? category
        : { ...category, statOrder: [...category.statOrder, statKey] },
    );
  const removeStatFromCategory = (categoryId: string, statKey: string) =>
    updateCategory(categoryId, (category) => ({
      ...category,
      statOrder: category.statOrder.filter((key) => key !== statKey),
    }));

  const addCategory = (categoryName: string) => {
    setConfig((prev) => {
      const categoryId = `custom-${Date.now()}`;

      return {
        ...prev,
        categoryOrder: [...prev.categoryOrder, categoryId],
        categories: {
          ...prev.categories,
          [categoryId]: {
            id: categoryId,
            name: categoryName,
            visible: true,
            statOrder: [],
          },
        },
      };
    });
  };

  const removeCategory = (categoryId: string) => {
    setConfig((prev) => {
      const remainingCategories = { ...prev.categories };
      delete remainingCategories[categoryId];

      return {
        ...prev,
        categoryOrder: prev.categoryOrder.filter((id) => id !== categoryId),
        categories: remainingCategories,
      };
    });
  };

  const resetToDefaults = () => {
    setConfig(createDefaultConfig(defaultCategories));
  };

  return {
    config,
    updateCategoryOrder,
    toggleCategoryVisibility,
    updateCategoryName,
    updateStatOrder,
    addStatToCategory,
    removeStatFromCategory,
    addCategory,
    removeCategory,
    resetToDefaults,
  };
};
