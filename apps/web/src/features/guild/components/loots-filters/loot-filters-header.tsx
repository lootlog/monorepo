import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Grid2X2, List, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { LootSearchCommand } from "./loot-search-command";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { useLootsViewMode } from "@/hooks/use-loots-view-mode";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { useTheme } from "@/hooks/context/use-theme";
import { FrozenButton } from "@/components/effects/rukia-frost";

export type LootFiltersHeaderProps = {
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
};

export const LootFiltersHeader = ({
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
}: LootFiltersHeaderProps) => {
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const { filters } = useLootsFilters();
  const { viewMode, setViewMode } = useLootsViewMode();
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";

  const hasSearchFilters =
    filters.npcs.length > 0 ||
    filters.itemNames.length > 0 ||
    filters.hid !== "" ||
    filters.players.length > 0;

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
      <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div
            className="flex-1 min-w-0"
            onMouseEnter={() => setHoveredButton("search")}
            onMouseLeave={() => setHoveredButton(null)}
          >
            {isRukiaTheme ? (
              <FrozenButton
                isHovered={hoveredButton === "search"}
                isActive={false}
                className="w-full"
              >
                <Button
                  variant="outline"
                  onClick={() => setIsCommandOpen(true)}
                  className="relative w-full justify-start text-muted-foreground"
                >
                  <Search className="h-4 w-4 mr-2" />
                  <span className="max-w-full truncate">
                    Szukaj przedmiotów, potworów, graczy...
                  </span>
                  <kbd className="pointer-events-none absolute right-2 top-[50%] translate-y-[-50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">Ctrl + K</span>
                  </kbd>
                  <AnimatePresence>
                    {hasSearchFilters && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                      />
                    )}
                  </AnimatePresence>
                </Button>
              </FrozenButton>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsCommandOpen(true)}
                className="relative w-full justify-start text-muted-foreground"
              >
                <Search className="h-4 w-4 mr-2" />
                <span className="max-w-full truncate">
                  Szukaj przedmiotów, potworów, graczy...
                </span>
                <kbd className="pointer-events-none absolute right-2 top-[50%] translate-y-[-50%] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                  <span className="text-xs">Ctrl + K</span>
                </kbd>
                <AnimatePresence>
                  {hasSearchFilters && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -left-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                    />
                  )}
                </AnimatePresence>
              </Button>
            )}
          </div>

          {!isMobile && (
            <>
              <WorldSwitcher className="max-w-48" />

              <div className="flex items-center gap-1 border-r border-border pr-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onMouseEnter={() => setHoveredButton("list")}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      {isRukiaTheme ? (
                        <FrozenButton
                          isHovered={hoveredButton === "list"}
                          isActive={viewMode === "list"}
                        >
                          <Button
                            onClick={() => setViewMode("list")}
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                          >
                            <List className="h-4 w-4" />
                          </Button>
                        </FrozenButton>
                      ) : (
                        <Button
                          onClick={() => setViewMode("list")}
                          variant={viewMode === "list" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Widok listy</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      onMouseEnter={() => setHoveredButton("grid")}
                      onMouseLeave={() => setHoveredButton(null)}
                    >
                      {isRukiaTheme ? (
                        <FrozenButton
                          isHovered={hoveredButton === "grid"}
                          isActive={viewMode === "grid"}
                        >
                          <Button
                            onClick={() => setViewMode("grid")}
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Grid2X2 className="h-4 w-4" />
                          </Button>
                        </FrozenButton>
                      ) : (
                        <Button
                          onClick={() => setViewMode("grid")}
                          variant={viewMode === "grid" ? "default" : "ghost"}
                          size="icon"
                          className="h-8 w-8"
                        >
                          <Grid2X2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Widok siatki</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div
                onMouseEnter={() => setHoveredButton("filter")}
                onMouseLeave={() => setHoveredButton(null)}
              >
                {isRukiaTheme ? (
                  <FrozenButton
                    isHovered={hoveredButton === "filter"}
                    isActive={isFiltersOpen}
                  >
                    <Button
                      onClick={onToggleFilters}
                      variant={isFiltersOpen ? "default" : "outline"}
                      size="icon"
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
                  </FrozenButton>
                ) : (
                  <Button
                    onClick={onToggleFilters}
                    variant={isFiltersOpen ? "default" : "outline"}
                    size="icon"
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
                )}
              </div>
            </>
          )}

          {isMobile && <WorldSwitcher />}
        </div>
      </Card>

      <LootSearchCommand open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </>
  );
};
