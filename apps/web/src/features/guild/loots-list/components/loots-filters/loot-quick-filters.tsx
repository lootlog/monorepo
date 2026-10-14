import { Button } from "@lootlog/ui/components/button";
import { toggleVariants } from "@lootlog/ui/lib/toggle-variants";
import { cn } from "cn";
import { BookmarkPlus, X, Zap } from "lucide-react";
import { LOOT_FILTER_PILL_CLASS } from "./loot-filter-pills";
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
  // A peer of the filter sections, so its header reads like theirs.
  <div className="border-b border-sidebar-border">
    <div className="flex h-11 items-center gap-1 pr-2 pl-4">
      <h3 className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
        <Zap aria-hidden="true" className="size-4 text-muted-foreground" />
        {t("loots.filtersPanel.quickFilters.title")}
      </h3>
      {canSaveCurrentFilter && (
        <Button
          variant="ghost"
          size="xs"
          className="text-primary hover:text-primary"
          onClick={() => setIsDialogOpen(true)}
        >
          <BookmarkPlus aria-hidden="true" />
          {t("loots.filtersPanel.quickFilters.saveButton")}
        </Button>
      )}
    </div>
    <div className="flex flex-wrap gap-1.5 px-4 pt-1 pb-4">
      {allQuickFilters.map((filter) => {
        const isApplied = isQuickFilterApplied(filter.filters);

        return (
          <div key={filter.id} className="group/quick-filter relative flex">
            {/* Drawn like the section pills, so every pressed pill means
                the same thing: it narrows the list. */}
            <button
              type="button"
              aria-pressed={isApplied}
              onClick={() => toggleQuickFilter(filter.filters)}
              className={cn(
                toggleVariants({ variant: "outline", size: "sm" }),
                "cursor-pointer",
                LOOT_FILTER_PILL_CLASS,
              )}
            >
              {filter.label}
            </button>
            {!("category" in filter) && (
              <button
                type="button"
                aria-label={t("loots.filtersPanel.quickFilters.remove", {
                  label: filter.label,
                })}
                className="absolute -top-1.5 -right-1.5 grid size-4 cursor-pointer place-items-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground opacity-100 transition-opacity outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:opacity-0 sm:group-hover/quick-filter:opacity-100 sm:group-focus-within/quick-filter:opacity-100"
                onClick={() => handleRemoveCustomFilter(filter.id)}
              >
                <X aria-hidden="true" className="size-2.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  </div>
);
