import { SectionCard } from "@/components/common/section-card/section-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@lootlog/ui/components/accordion";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { Label } from "@lootlog/ui/components/label";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "cn";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { X } from "lucide-react";
import { ActorNameSelector } from "./actor-name-selector";

import { isBefore, startOfDay } from "date-fns";
import {
  getActivityLogSources,
  getActivityLogTypes,
} from "../activity-logs.queries";

import { useActivityLogsFilterModel } from "./use-activity-logs-filter-model";

export const ActivityLogsFiltersSidebar = (
  props: Parameters<typeof useActivityLogsFilterModel>[0],
) => {
  const {
    className,
    t,
    filters,
    nameSuggestions,
    updateFilters,
    clanNameSuggestions,
    activityTypes,
    activitySources,
    startDateValue,
    endDateValue,
    isStartDateDisabled,
    isEndDateDisabled,
    hasActiveFilters,
    clearFilters,
  } = useActivityLogsFilterModel(props);

  const selectedTypes = new Set(filters.types);
  const selectedSources = new Set(filters.sources);

  return (
    <div
      className={cn(
        "w-[320px] h-full flex flex-col shrink-0 bg-background py-3 pr-3",
        className,
      )}
    >
      <SectionCard className="flex-1 flex flex-col min-h-0 bg-filters-sidebar">
        <SectionCardHeader title={t("activityLogs.filters.title")} />
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Accordion
                multiple
                defaultValue={["general", "type", "source", "date"]}
                className="space-y-4"
              >
                <AccordionItem value="general" className="space-y-3">
                  <AccordionTrigger>
                    {t("activityLogs.filters.general")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("activityLogs.filters.playerName")}
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
                        placeholder={t(
                          "activityLogs.filters.nameSearchPlaceholder",
                        )}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("activityLogs.filters.clanName")}
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
                        placeholder={t(
                          "activityLogs.filters.clanSearchPlaceholder",
                        )}
                        className="w-full"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <Separator />

                <AccordionItem value="type" className="space-y-3">
                  <AccordionTrigger>
                    {t("activityLogs.filters.type")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="flex flex-col gap-2">
                      {activityTypes.map((type) => (
                        <div
                          key={type.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`type-${type.value}`}
                            checked={selectedTypes.has(type.value)}
                            onCheckedChange={(checked) => {
                              const currentTypes = getActivityLogTypes(
                                filters.types,
                              );

                              const newTypes = checked
                                ? [...currentTypes, type.value]
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
                  <AccordionTrigger>
                    {t("activityLogs.filters.source")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div className="flex flex-col gap-2">
                      {activitySources.map((source) => (
                        <div
                          key={source.value}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`source-${source.value}`}
                            checked={selectedSources.has(source.value)}
                            onCheckedChange={(checked) => {
                              const currentSources = getActivityLogSources(
                                filters.sources,
                              );

                              const newSources = checked
                                ? [...currentSources, source.value]
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
                  <AccordionTrigger>
                    {t("activityLogs.filters.dateRange")}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("activityLogs.filters.startDate")}
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
                        placeholder={t(
                          "activityLogs.filters.startDatePlaceholder",
                        )}
                        className="w-full"
                        disabled={isStartDateDisabled}
                      />
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block">
                        {t("activityLogs.filters.endDate")}
                      </Label>
                      <DateTimePicker
                        value={endDateValue}
                        onChange={(date) =>
                          updateFilters({
                            endDate: date?.toISOString() ?? "",
                          })
                        }
                        placeholder={t(
                          "activityLogs.filters.endDatePlaceholder",
                        )}
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
            <m.div
              layout
              initial={{ opacity: 0, scaleY: 0.96 }}
              animate={{ opacity: 1, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.96 }}
              style={{ transformOrigin: "bottom" }}
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
                  {t("loots.filtersPanel.quickFilters.clearButton")}
                </Button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </SectionCard>
    </div>
  );
};
