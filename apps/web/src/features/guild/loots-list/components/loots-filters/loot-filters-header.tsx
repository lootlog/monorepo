import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Kbd } from "@lootlog/ui/components/kbd";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Grid2X2, List, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { LootSearchCommand } from "./loot-search-command";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useViewMode } from "@/hooks/use-view-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTranslation } from "react-i18next";
import { ThemeInteractiveFrame } from "@/themes";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { cn } from "@lootlog/ui/lib/utils";
import { getPrimaryModifierKeyLabel } from "@/utils/platform/get-primary-modifier-key-label";

export type LootFiltersHeaderProps = {
  isFiltersOpen: boolean;
  isCompactLayout: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
};

export const LootFiltersHeader = ({
  isFiltersOpen,
  isCompactLayout,
  hasActiveFilters,
  onToggleFilters,
}: LootFiltersHeaderProps) => {
  const { t } = useTranslation();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();
  const { viewMode, setViewMode } = useViewMode("loots-view-mode");
  const primaryModifierKeyLabel = getPrimaryModifierKeyLabel();

  const hasSearchFilters =
    filters.npcs.length > 0 ||
    filters.itemNames.length > 0 ||
    filters.hid !== "" ||
    filters.players.length > 0;
  const usesStackedControls = isMobile || isCompactLayout;

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
      {(!isMobile || world) && (
        <Card className="gap-2 rounded-xl border-border bg-card p-2 shadow-none">
          <div
            className={cn(
              "flex items-center gap-2",
              isMobile ? "flex-nowrap" : "flex-wrap",
            )}
          >
            {(!isMobile || world) && (
              <div
                className={cn(
                  "min-w-0 flex-1",
                  !isMobile && isCompactLayout && "min-w-48 flex-[1_1_16rem]",
                )}
              >
                <Button
                  variant="outline"
                  onClick={() => setIsCommandOpen(true)}
                  className="relative h-9 w-full justify-start font-normal text-muted-foreground hover:border-foreground/20 hover:bg-foreground/[0.04] hover:text-foreground"
                >
                  <Search className="size-4 shrink-0" />
                  <span
                    className={cn("truncate", !usesStackedControls && "pr-16")}
                  >
                    {t("loots.header.searchPlaceholder")}
                  </span>
                  {!usesStackedControls && (
                    <Kbd className="absolute right-2 top-1/2 -translate-y-1/2">
                      {t("loots.header.shortcut", {
                        modifier: primaryModifierKeyLabel,
                      })}
                    </Kbd>
                  )}
                  <AnimatePresence>
                    {hasSearchFilters && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -left-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary"
                      />
                    )}
                  </AnimatePresence>
                </Button>
              </div>
            )}

            {!usesStackedControls && (
              <div aria-hidden className="relative h-9 w-3 shrink-0">
                <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-border" />
              </div>
            )}

            {!isMobile && (
              <div
                className={cn(
                  "flex min-w-0 items-center gap-2",
                  isCompactLayout ? "contents" : "w-[19.5rem] shrink-0",
                )}
              >
                <div
                  className={
                    isCompactLayout ? "w-[180px] shrink-0" : "min-w-0 flex-1"
                  }
                >
                  <WorldSwitcher width="w-full" />
                </div>

                <div
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl border border-border bg-background/35 p-0.5",
                    isCompactLayout && "ml-auto",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onMouseEnter={() => setHoveredButton("list")}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        <ThemeInteractiveFrame
                          isHovered={hoveredButton === "list"}
                          isActive={viewMode === "list"}
                        >
                          <Button
                            onClick={() => setViewMode("list")}
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="icon"
                            aria-label={t("loots.header.listView")}
                            aria-pressed={viewMode === "list"}
                            className="h-8 w-8"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </ThemeInteractiveFrame>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t("loots.header.listView")}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        onMouseEnter={() => setHoveredButton("grid")}
                        onMouseLeave={() => setHoveredButton(null)}
                      >
                        <ThemeInteractiveFrame
                          isHovered={hoveredButton === "grid"}
                          isActive={viewMode === "grid"}
                        >
                          <Button
                            onClick={() => setViewMode("grid")}
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="icon"
                            aria-label={t("loots.header.gridView")}
                            aria-pressed={viewMode === "grid"}
                            className="h-8 w-8"
                          >
                            <Grid2X2 className="h-4 w-4" />
                          </Button>
                        </ThemeInteractiveFrame>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t("loots.header.gridView")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div
                  onMouseEnter={() => setHoveredButton("filter")}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  <ThemeInteractiveFrame
                    isHovered={hoveredButton === "filter"}
                    isActive={isFiltersOpen}
                  >
                    <Button
                      onClick={onToggleFilters}
                      variant={isFiltersOpen ? "default" : "outline"}
                      size="icon"
                      aria-label={t("loots.header.mobileFiltersTitle")}
                      aria-expanded={isFiltersOpen}
                      className="relative shrink-0 h-8 w-8"
                    >
                      <Filter className="h-4 w-4" />
                      <AnimatePresence>
                        {hasActiveFilters && !isFiltersOpen && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
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
          </div>
        </Card>
      )}

      <LootSearchCommand open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </>
  );
};
