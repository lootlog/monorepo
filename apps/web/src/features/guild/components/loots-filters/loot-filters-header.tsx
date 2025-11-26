import { Button } from "@lootlog/ui/components/button";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { LootSearchCommand } from "./loot-search-command";
import { useLootsFilters } from "@/hooks/use-loots-filters";

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
  const isMobile = useIsMobile();
  const { filters } = useLootsFilters();

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
      <div className="bg-background w-full flex items-center border-b h-14">
        <div className="flex-1 min-w-0 px-3">
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
        </div>

        {!isMobile && (
          <div
            style={{ width: 320 }}
            className="flex items-center gap-2 justify-end shrink-0 h-full border-l border-border px-3"
          >
            <WorldSwitcher className="flex-1" />
            <Button
              onClick={onToggleFilters}
              variant={isFiltersOpen ? "default" : "outline"}
              size="icon"
              className="relative shrink-0"
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
          </div>
        )}

        {isMobile && <WorldSwitcher className="pr-3" />}
      </div>

      {isMobile && (
        <Button
          onClick={onToggleFilters}
          size="icon"
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-20 md:hidden"
        >
          <Filter className="h-5 w-5" />
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

      <LootSearchCommand open={isCommandOpen} onOpenChange={setIsCommandOpen} />
    </>
  );
};
