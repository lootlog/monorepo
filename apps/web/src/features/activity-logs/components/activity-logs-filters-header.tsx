import { Button } from "@lootlog/ui/components/button";
import { AnimatePresence, motion } from "framer-motion";
import { Filter } from "lucide-react";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";

export type ActivityLogsFiltersHeaderProps = {
  isFiltersOpen: boolean;
  hasActiveFilters: boolean;
  onToggleFilters: () => void;
  worldOptions: Array<{ value: string; label: string }>;
  selectedWorld: string;
  onWorldChange: (world: string) => void;
};

export const ActivityLogsFiltersHeader = ({
  isFiltersOpen,
  hasActiveFilters,
  onToggleFilters,
  worldOptions,
  selectedWorld,
  onWorldChange,
}: ActivityLogsFiltersHeaderProps) => {
  const isMobile = useIsMobile();

  return (
    <>
      <div className="bg-background w-full flex items-center border-b h-14">
        <div className="flex-1 min-w-0 px-3">
          <h2 className="text-lg font-semibold">Logi aktywności</h2>
        </div>

        {!isMobile && (
          <div
            style={{ width: 320 }}
            className="flex items-center gap-2 justify-end shrink-0 h-full border-l border-border px-3"
          >
            <Select
              value={selectedWorld || undefined}
              onValueChange={(value) =>
                onWorldChange(value !== "all" ? value : "")
              }
            >
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Wszystkie światy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie światy</SelectItem>
                {worldOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {capitalizeFirstLetter(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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

        {isMobile && (
          <div className="pr-3">
            <WorldSwitcher />
          </div>
        )}
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
    </>
  );
};
