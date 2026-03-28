import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Separator } from "@lootlog/ui/components/separator";
import { Label } from "@lootlog/ui/components/label";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { type FC } from "react";
import { cn } from "@lootlog/ui/lib/utils";
import { ActorNameSelector } from "./actor-name-selector";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import type {
  ActivityType,
  ActivitySource,
} from "@/hooks/api/activity-logs/use-activity-logs";
import { isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { useActivityActorNameSuggestions } from "@/hooks/api/activity-logs/use-activity-actor-name-suggestions";
import { useActivityClanNameSuggestions } from "@/hooks/api/activity-logs/use-activity-clan-name-suggestions";
import { useGuild } from "@/hooks/api/guilds/use-guild";

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "CONNECT_EVENT", label: "Połączenie" },
  { value: "DISCONNECT_EVENT", label: "Rozłączenie" },
];

const ACTIVITY_SOURCES: { value: ActivitySource; label: string }[] = [
  { value: "GAME", label: "Gra" },
  { value: "WEB_APP", label: "Strona internetowa" },
];

type ActivityLogsFiltersSidebarProps = {
  className?: string;
};

export const ActivityLogsFiltersSidebar: FC<
  ActivityLogsFiltersSidebarProps
> = ({ className }) => {
  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useActivityLogsFilters();
  const { data: guild } = useGuild();
  const { data: nameSuggestions = [] } = useActivityActorNameSuggestions({
    guildId: guild?.id,
    search: filters.name ?? "",
    debounceMs: 300,
  });
  const { data: clanNameSuggestions = [] } = useActivityClanNameSuggestions({
    guildId: guild?.id,
    search: filters.clanName ?? "",
    debounceMs: 300,
  });

  const startDateValue = filters.startDate
    ? new Date(filters.startDate)
    : undefined;
  const endDateValue = filters.endDate ? new Date(filters.endDate) : undefined;
  const today = startOfDay(new Date());
  const minSelectableDate = startOfDay(subDays(today, 7));

  const normalizedStartDate = startDateValue
    ? startOfDay(startDateValue)
    : undefined;
  const isStartDateDisabled = (date: Date) => {
    const normalizedDate = startOfDay(date);

    return (
      isBefore(normalizedDate, minSelectableDate) ||
      isAfter(normalizedDate, today)
    );
  };
  const isEndDateDisabled = (date: Date) => {
    const normalizedDate = startOfDay(date);

    if (isBefore(normalizedDate, minSelectableDate)) {
      return true;
    }

    if (isAfter(normalizedDate, today)) {
      return true;
    }

    if (normalizedStartDate && isBefore(normalizedDate, normalizedStartDate)) {
      return true;
    }

    return false;
  };

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters((currentFilters) => {
      const mergedFilters = {
        ...currentFilters,
        ...newFilters,
      };

      return {
        types: mergedFilters.types.length > 0 ? mergedFilters.types : null,
        sources:
          mergedFilters.sources.length > 0 ? mergedFilters.sources : null,
        startDate: mergedFilters.startDate || null,
        endDate: mergedFilters.endDate || null,
        name: mergedFilters.name || null,
        clanName: mergedFilters.clanName || null,
        world: mergedFilters.world || null,
      };
    });
  };

  return (
    <div
      className={cn(
        "w-[320px] h-full flex flex-col shrink-0 bg-background/50 py-3 pr-3",
        className,
      )}
    >
      <Card className="flex-1 flex flex-col min-h-0 bg-filters-sidebar border-border backdrop-blur-sm p-0">
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Accordion
                type="multiple"
                defaultValue={["general", "type", "source", "date"]}
                className="space-y-4"
              >
                <AccordionItem value="general" className="space-y-3">
                  <AccordionTrigger>Filtry ogólne</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Nazwa gracza
                      </Label>
                      <ActorNameSelector
                        value={filters.name ?? ""}
                        suggestions={nameSuggestions}
                        searchValue={filters.name ?? ""}
                        onSearchChange={(value) =>
                          updateFilters({ name: value })
                        }
                        onValueChange={(value) =>
                          updateFilters({ name: value })
                        }
                        placeholder="Szukaj po nazwie..."
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Nazwa klanu
                      </Label>
                      <ActorNameSelector
                        value={filters.clanName ?? ""}
                        suggestions={clanNameSuggestions}
                        searchValue={filters.clanName ?? ""}
                        onSearchChange={(value) =>
                          updateFilters({ clanName: value })
                        }
                        onValueChange={(value) =>
                          updateFilters({ clanName: value })
                        }
                        placeholder="Szukaj po klanie..."
                        className="w-full"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="type" className="space-y-3">
                  <AccordionTrigger>Typ aktywności</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="flex flex-col gap-2">
                      {ACTIVITY_TYPES.map((type) => (
                        <div
                          key={type.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`type-${type.value}`}
                            checked={filters.types.includes(
                              type.value as string,
                            )}
                            onCheckedChange={(checked) => {
                              const currentTypes = filters.types;
                              const newTypes = checked
                                ? [...currentTypes, type.value as string]
                                : currentTypes.filter((t) => t !== type.value);
                              updateFilters({ types: newTypes });
                            }}
                          />
                          <Label
                            htmlFor={`type-${type.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {type.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="source" className="space-y-3">
                  <AccordionTrigger>Źródło</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="flex flex-col gap-2">
                      {ACTIVITY_SOURCES.map((source) => (
                        <div
                          key={source.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`source-${source.value}`}
                            checked={filters.sources.includes(
                              source.value as string,
                            )}
                            onCheckedChange={(checked) => {
                              const currentSources = filters.sources;
                              const newSources = checked
                                ? [...currentSources, source.value as string]
                                : currentSources.filter(
                                    (s) => s !== source.value,
                                  );
                              updateFilters({ sources: newSources });
                            }}
                          />
                          <Label
                            htmlFor={`source-${source.value}`}
                            className="text-sm cursor-pointer"
                          >
                            {source.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="date" className="space-y-3">
                  <AccordionTrigger>Zakres dat</AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Data początkowa
                      </Label>
                      <DateTimePicker
                        value={startDateValue}
                        onChange={(date) => {
                          const normalizedDate = date
                            ? startOfDay(date)
                            : undefined;
                          const normalizedEndDate = endDateValue
                            ? startOfDay(endDateValue)
                            : undefined;
                          const shouldClearEndDate =
                            normalizedDate &&
                            normalizedEndDate &&
                            isBefore(normalizedEndDate, normalizedDate);

                          updateFilters({
                            startDate: date?.toISOString() ?? "",
                            endDate: shouldClearEndDate ? "" : filters.endDate,
                          });
                        }}
                        placeholder="Wybierz datę początkową"
                        className="w-full"
                        disabled={isStartDateDisabled}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        Data końcowa
                      </Label>
                      <DateTimePicker
                        value={endDateValue}
                        onChange={(date) =>
                          updateFilters({
                            endDate: date?.toISOString() ?? "",
                          })
                        }
                        placeholder="Wybierz datę końcową"
                        className="w-full"
                        disabled={isEndDateDisabled}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </div>

        <AnimatePresence>
          {hasActiveFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 56, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-border px-4 overflow-hidden"
            >
              <div className="h-14 flex items-center w-full">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-2" />
                  Wyczyść filtry
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
