import { useLocalStorage } from "usehooks-ts";
import type {
  CategoryCustomization,
  StatsCustomizationConfig,
} from "@/types/stats-customization.types";

const STORAGE_KEY = "lootlog-battle-stats-customization";

interface StatCategory {
  name: string;
  stats: Array<{ key: string; label: string }>;
}

const createDefaultConfig = (
  categories: StatCategory[],
): StatsCustomizationConfig => {
  const categoryOrder = categories.map((cat) => cat.name);
  const categoriesMap: Record<string, CategoryCustomization> = {};

  for (const category of categories) {
    categoriesMap[category.name] = {
      id: category.name,
      name: category.name,
      visible: true,
      statOrder: category.stats.map((stat) => stat.key),
    };
  }

  return {
    categoryOrder,
    categories: categoriesMap,
  };
};

export const useStatsCustomization = (defaultCategories: StatCategory[]) => {
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

  const toggleCategoryVisibility = (categoryId: string) => {
    setConfig((prev) => {
      const category = prev.categories[categoryId];
      if (!category) return prev;

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: {
            ...category,
            visible: !category.visible,
          },
        },
      };
    });
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    setConfig((prev) => {
      const category = prev.categories[categoryId];
      if (!category) return prev;

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: {
            ...category,
            name: newName,
          },
        },
      };
    });
  };

  const updateStatOrder = (categoryId: string, newOrder: string[]) => {
    setConfig((prev) => {
      const category = prev.categories[categoryId];
      if (!category) return prev;

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: {
            ...category,
            statOrder: newOrder,
          },
        },
      };
    });
  };

  const addStatToCategory = (categoryId: string, statKey: string) => {
    setConfig((prev) => {
      const category = prev.categories[categoryId];
      if (!category || category.statOrder.includes(statKey)) return prev;

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: {
            ...category,
            statOrder: [...category.statOrder, statKey],
          },
        },
      };
    });
  };

  const removeStatFromCategory = (categoryId: string, statKey: string) => {
    setConfig((prev) => {
      const category = prev.categories[categoryId];
      if (!category) return prev;

      return {
        ...prev,
        categories: {
          ...prev.categories,
          [categoryId]: {
            ...category,
            statOrder: category.statOrder.filter((key) => key !== statKey),
          },
        },
      };
    });
  };

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
      const { [categoryId]: _removed, ...remainingCategories } =
        prev.categories;

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
