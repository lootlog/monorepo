import { FilterBar } from "@/components/common/filter-bar";
import { Button } from "@lootlog/ui/components/button";
import { Kbd } from "@lootlog/ui/components/kbd";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { LootSearchCommand } from "./loot-search-command";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import { LOOTS_VIEW_MODE_KEY } from "@/features/guild/loots-list/loots-list-layout";
import { useTranslation } from "react-i18next";
import { ThemeInteractiveFrame } from "@/themes";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { cn } from "cn";
import { getPrimaryModifierKeyLabel } from "@/utils/platform/get-primary-modifier-key-label";

export type LootFiltersHeaderProps = {
  isFiltersOpen: boolean;
  isCompactLayout: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
};

const getLootFiltersHeaderState = (
  filters: {
    hid: string;
    itemNames: readonly unknown[];
    npcs: readonly unknown[];
    players: readonly unknown[];
  },
  isMobile: boolean,
  isCompactLayout: boolean,
  world: string | undefined,
) => ({
  hasSearchFilters:
    filters.npcs.length > 0 ||
    filters.itemNames.length > 0 ||
    filters.hid !== "" ||
    filters.players.length > 0,
  showWorldControls: !isMobile || Boolean(world),
  usesStackedControls: isMobile || isCompactLayout,
});

export const LootFiltersHeader = ({
  isFiltersOpen,
  isCompactLayout,
  hasActiveFilters,
  onToggleFilters,
}: LootFiltersHeaderProps) => {
  const { t } = useTranslation();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isFilterHovered, setIsFilterHovered] = useState(false);
  const isMobile = useIsMobile();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();
  const { viewMode, setViewMode } = useViewMode(LOOTS_VIEW_MODE_KEY);
  const primaryModifierKeyLabel = getPrimaryModifierKeyLabel();

  const { hasSearchFilters, showWorldControls, usesStackedControls } =
    getLootFiltersHeaderState(filters, isMobile, isCompactLayout, world);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      {showWorldControls && (
        <FilterBar ariaLabel={t("loots.header.toolbarLabel")}>
          <div
            className={cn(
              "min-w-0 flex-1",
              isMobile ? "basis-0" : "min-w-48 basis-48",
            )}
          >
            <Button
              variant="outline"
              onClick={() => setIsCommandOpen(true)}
              className="relative h-9 w-full justify-start font-normal text-muted-foreground hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground"
            >
              <Search className="size-4 shrink-0" />
              <span className={cn("truncate", !usesStackedControls && "pr-16")}>
                {t("loots.header.searchPlaceholder")}
              </span>
              {!usesStackedControls && (
                <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">
                  {t("loots.header.shortcut", {
                    modifier: primaryModifierKeyLabel,
                  })}
                </Kbd>
              )}
              {/* The responsive toolbar owns this button; filter changes keep the presence boundary mounted. */}
              {/* eslint-disable-next-line react-doctor/motion-animate-presence-must-outlive-child */}
              <AnimatePresence>
                {hasSearchFilters && (
                  <m.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="absolute -left-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary"
                  />
                )}
              </AnimatePresence>
            </Button>
          </div>

          {!usesStackedControls && (
            <div aria-hidden className="relative h-9 w-3 shrink-0">
              <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border" />
            </div>
          )}

          {!isMobile && (
            // The controls wrap as one group, so a narrow toolbar never strands
            // a single button on its own line.
            <div
              className={cn(
                "flex shrink-0 items-center gap-2",
                isCompactLayout ? "ml-auto" : "w-[19.5rem]",
              )}
            >
              <div
                className={
                  isCompactLayout ? "w-[180px] shrink-0" : "min-w-0 flex-1"
                }
              >
                <WorldSwitcher width="w-full" />
              </div>

              <ViewModeToggle
                value={viewMode}
                onChange={setViewMode}
                listLabel={t("loots.header.listView")}
                gridLabel={t("loots.header.gridView")}
              />

              <div
                onMouseEnter={() => setIsFilterHovered(true)}
                onMouseLeave={() => setIsFilterHovered(false)}
              >
                <ThemeInteractiveFrame
                  isHovered={isFilterHovered}
                  isActive={isFiltersOpen}
                >
                  <Button
                    onClick={onToggleFilters}
                    variant={isFiltersOpen ? "default" : "outline"}
                    size="icon"
                    aria-label={t("loots.header.mobileFiltersTitle")}
                    aria-expanded={isFiltersOpen}
                    className="relative size-9 shrink-0"
                  >
                    <Filter className="h-4 w-4" />
                    {/* The responsive toolbar owns this button; filter changes keep the presence boundary mounted. */}
                    {/* eslint-disable-next-line react-doctor/motion-animate-presence-must-outlive-child */}
                    <AnimatePresence>
                      {hasActiveFilters && !isFiltersOpen && (
                        <m.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.95, opacity: 0 }}
                          className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                        />
                      )}
                    </AnimatePresence>
                  </Button>
                </ThemeInteractiveFrame>
              </div>
            </div>
          )}

          {isMobile && (
            <div className="w-[42%] min-w-28 shrink-0">
              <WorldSwitcher
                width="w-full"
                triggerClassName="w-full justify-between"
              />
            </div>
          )}
        </FilterBar>
      )}

      <LootSearchCommand open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </>
  );
};
