import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Filter } from "lucide-react";
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
    <Card className="gap-3 border-border bg-card/60 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 shadow-inner shadow-primary/10">
          <Activity className="size-4 text-primary" />
        </div>
        <h2 className="text-base font-semibold">Logi aktywności</h2>

        <div className="flex-1" />

        {!isMobile && (
          <>
            <Select
              value={selectedWorld || undefined}
              onValueChange={(value) =>
                onWorldChange(value !== "all" ? value : "")
              }
            >
              <SelectTrigger className="h-9 w-48">
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
          </>
        )}

        {isMobile && <WorldSwitcher />}
      </div>
    </Card>
  );
};
