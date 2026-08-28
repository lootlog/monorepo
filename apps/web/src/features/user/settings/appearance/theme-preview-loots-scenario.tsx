import { cn } from "@lootlog/ui/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ThemePreviewLootCard } from "./theme-preview-loot-card";
import { ThemePreviewLootFilters } from "./theme-preview-loot-filters";
import { ThemePreviewLootToolbar } from "./theme-preview-loot-toolbar";
import { THEME_PREVIEW_LOOTS } from "./theme-preview-fixtures";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";

interface ThemePreviewLootsScenarioProps {
  viewport: ThemePreviewViewport;
}

export const ThemePreviewLootsScenario = ({
  viewport,
}: ThemePreviewLootsScenarioProps) => {
  const { t } = useTranslation();
  const [filtersOpen, setFiltersOpen] = useState(viewport === "desktop");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const normalizedQuery = query.trim().toLocaleLowerCase("pl");
  const visibleLoots = THEME_PREVIEW_LOOTS.filter((loot) => {
    if (!normalizedQuery) return true;
    const npcName = t(
      `settings.appearance.preview.loots.npcs.${loot.npcKey}`,
    ).toLocaleLowerCase("pl");
    const itemName = t(
      `settings.appearance.preview.lootFixtures.${loot.itemKey}.name`,
    ).toLocaleLowerCase("pl");
    return (
      npcName.includes(normalizedQuery) || itemName.includes(normalizedQuery)
    );
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="px-3 pt-3">
        <ThemePreviewLootToolbar
          filtersOpen={filtersOpen}
          query={query}
          viewport={viewport}
          viewMode={viewMode}
          onFiltersOpenChange={setFiltersOpen}
          onQueryChange={setQuery}
          onViewModeChange={setViewMode}
        />
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto p-3">
          <div
            className={cn(
              "grid gap-3",
              viewMode === "grid" && viewport === "desktop" && "grid-cols-2",
            )}
          >
            {visibleLoots.map((loot) => (
              <ThemePreviewLootCard
                key={loot.key}
                fixture={loot}
                viewport={viewport}
              />
            ))}
          </div>
          <p className="py-5 text-center text-xs text-muted-foreground">
            {t("loots.list.end")}
          </p>
        </div>
        {viewport === "desktop" && filtersOpen ? (
          <ThemePreviewLootFilters />
        ) : null}
      </div>
      {viewport !== "desktop" && filtersOpen ? (
        <div className="absolute inset-y-14 right-0 z-40 bg-background shadow-[-12px_0_32px_-18px_var(--theme-shadow)]">
          <ThemePreviewLootFilters onClose={() => setFiltersOpen(false)} />
        </div>
      ) : null}
    </div>
  );
};
