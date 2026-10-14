import { Button } from "@lootlog/ui/components/button";
import { BookmarkPlus, X } from "lucide-react";
import type { LootFiltersState } from "./loot-filter-sections";

type LootQuickFiltersProps = Pick<
  LootFiltersState,
  | "t"
  | "allQuickFilters"
  | "isQuickFilterApplied"
  | "toggleQuickFilter"
  | "handleRemoveCustomFilter"
  | "canSaveCurrentFilter"
  | "setIsDialogOpen"
>;

/** Built-in and saved filter sets at the top of the filters panel. */
export const LootQuickFilters = ({
  t,
  allQuickFilters,
  isQuickFilterApplied,
  toggleQuickFilter,
  handleRemoveCustomFilter,
  canSaveCurrentFilter,
  setIsDialogOpen,
}: LootQuickFiltersProps) => (
  <div className="border-b border-sidebar-border px-4 pt-2 pb-3">
    <div className="flex h-8 items-center justify-between">
      <h3 className="text-xs font-medium text-muted-foreground">
        {t("loots.filtersPanel.quickFilters.title")}
      </h3>
      {canSaveCurrentFilter && (
        <Button
          variant="ghost"
          size="xs"
          className="-mr-2 text-primary hover:text-primary"
          onClick={() => setIsDialogOpen(true)}
        >
          <BookmarkPlus aria-hidden="true" />
          {t("loots.filtersPanel.quickFilters.saveButton")}
        </Button>
      )}
    </div>
    <div className="-mx-2 mt-1 flex flex-wrap gap-1">
      {allQuickFilters.map((filter) => {
        const isApplied = isQuickFilterApplied(filter.filters);

        return (
          <div key={filter.id} className="group flex items-center">
            <Button
              type="button"
              variant={isApplied ? "default" : "ghost"}
              size="sm"
              aria-pressed={isApplied}
              onClick={() => toggleQuickFilter(filter.filters)}
              className={isApplied ? undefined : "text-muted-foreground"}
            >
              {filter.label}
            </Button>
            {!("category" in filter) && (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t("loots.filtersPanel.quickFilters.remove", {
                  label: filter.label,
                })}
                className="opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                onClick={() => handleRemoveCustomFilter(filter.id)}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
