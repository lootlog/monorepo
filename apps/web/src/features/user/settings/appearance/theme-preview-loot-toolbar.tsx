import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { cn } from "@lootlog/ui/lib/utils";
import { Filter, Grid2X2, List, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ThemePreviewViewport } from "./theme-builder-preview-types";

interface ThemePreviewLootToolbarProps {
  filtersOpen: boolean;
  onFiltersOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onViewModeChange: (viewMode: "list" | "grid") => void;
  query: string;
  viewport: ThemePreviewViewport;
  viewMode: "list" | "grid";
}

const WORLD_VALUES = ["luvia", "gordion"] as const;

export const ThemePreviewLootToolbar = ({
  filtersOpen,
  onFiltersOpenChange,
  onQueryChange,
  onViewModeChange,
  query,
  viewport,
  viewMode,
}: ThemePreviewLootToolbarProps) => {
  const { t } = useTranslation();
  const isCompact = viewport !== "desktop";
  const worldItems = WORLD_VALUES.map((value) => ({
    label: t(`settings.appearance.preview.shell.worldNames.${value}`),
    value,
  }));

  return (
    <Card
      data-slot="preview-loot-filters"
      className="gap-2 rounded-xl border-border bg-card p-2 shadow-none"
    >
      <div className={cn("flex items-center gap-2", isCompact && "flex-wrap")}>
        <label className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("loots.header.searchPlaceholder")}
            className="h-9 pl-9"
          />
          <span className="sr-only">{t("common.search")}</span>
        </label>
        <Select items={worldItems} defaultValue="luvia">
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {worldItems.map((world) => (
              <SelectItem key={world.value} value={world.value}>
                {world.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-0.5 rounded-xl border border-border bg-background p-0.5">
          <Button
            type="button"
            size="icon"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="size-8"
            aria-label={t("loots.header.listView")}
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <List />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={viewMode === "grid" ? "default" : "ghost"}
            className="size-8"
            aria-label={t("loots.header.gridView")}
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <Grid2X2 />
          </Button>
        </div>
        <Button
          type="button"
          size="icon"
          variant={filtersOpen ? "default" : "outline"}
          className="size-9"
          aria-label={t("loots.header.mobileFiltersTitle")}
          aria-expanded={filtersOpen}
          onClick={() => onFiltersOpenChange(!filtersOpen)}
        >
          <Filter />
        </Button>
      </div>
    </Card>
  );
};
