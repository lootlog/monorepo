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
import type { FC } from "react";
import { cn } from "@lootlog/ui/lib/utils";
import { ActorNameSelector } from "./actor-name-selector";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import type { ActivitiesControllerFindByGuildSourceItem } from "@lootlog/api-client/models/activity/activities-controller-find-by-guild-source-item";
import type { ActivitiesControllerFindByGuildTypeItem } from "@lootlog/api-client/models/activity/activities-controller-find-by-guild-type-item";
import { isAfter, isBefore, startOfDay, subDays } from "date-fns";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@lootlog/api-client/react-query/main/guilds";
import { useQuery } from "@tanstack/react-query";
import {
  getActivityLogSources,
  getActivityLogTypes,
} from "../activity-logs.queries";
import {
  getActivitiesControllerSuggestActorNamesQueryKey,
  getActivitiesControllerSuggestActorNamesQueryOptions,
  getActivitiesControllerSuggestClanNamesQueryKey,
  getActivitiesControllerSuggestClanNamesQueryOptions,
} from "@lootlog/api-client/react-query/activity/guilds";
import { useTranslation } from "react-i18next";
import { useDebounceValue } from "usehooks-ts";

type ActivityLogsFiltersSidebarProps = {
  className?: string;
};

const optionalText = (value: string) => (value.length > 0 ? value : undefined);

const getDateValue = (value: string | null | undefined) =>
  value ? new Date(value) : undefined;

export const ActivityLogsFiltersSidebar: FC<
  ActivityLogsFiltersSidebarProps
> = ({ className }) => {
  const { t } = useTranslation();
  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useActivityLogsFilters();
  const guildId = useGuildId();
  const [debouncedNameSearch] = useDebounceValue(filters.name ?? "", 300);
  const [debouncedClanSearch] = useDebounceValue(filters.clanName ?? "", 300);
  const trimmedNameSearch = debouncedNameSearch.trim();
  const trimmedClanSearch = debouncedClanSearch.trim();
  const { data: guild } = useGuildsControllerGetGuildById({
    guildId: guildId ?? "",
  });
  const activityGuildId = guild?.id ?? "";
  const nameSearch = optionalText(trimmedNameSearch);
  const clanSearch = optionalText(trimmedClanSearch);
  const { data: nameSuggestionsResponse } = useQuery(
    getActivitiesControllerSuggestActorNamesQueryOptions(
      { guildId: activityGuildId },
      { search: nameSearch, limit: 8 },
      {
        query: {
          enabled: Boolean(activityGuildId && trimmedNameSearch.length >= 1),
          queryKey: getActivitiesControllerSuggestActorNamesQueryKey(
            { guildId: activityGuildId },
            { search: nameSearch, limit: 8 },
          ),
          staleTime: 5 * 60 * 1000,
        },
      },
    ),
  );
  const { data: clanNameSuggestionsResponse } = useQuery(
    getActivitiesControllerSuggestClanNamesQueryOptions(
      { guildId: activityGuildId },
      { search: clanSearch, limit: 8 },
      {
        query: {
          enabled: Boolean(activityGuildId && trimmedClanSearch.length >= 1),
          queryKey: getActivitiesControllerSuggestClanNamesQueryKey(
            { guildId: activityGuildId },
            { search: clanSearch, limit: 8 },
          ),
          staleTime: 5 * 60 * 1000,
        },
      },
    ),
  );
  const nameSuggestions = nameSuggestionsResponse?.suggestions ?? [];
  const clanNameSuggestions = clanNameSuggestionsResponse?.suggestions ?? [];

  const startDateValue = getDateValue(filters.startDate);
  const endDateValue = getDateValue(filters.endDate);
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
        types: (() => {
          const nextTypes = getActivityLogTypes(mergedFilters.types);
          return nextTypes.length > 0 ? nextTypes : null;
        })(),
        sources: (() => {
          const nextSources = getActivityLogSources(mergedFilters.sources);
          return nextSources.length > 0 ? nextSources : null;
        })(),
        startDate: mergedFilters.startDate || null,
        endDate: mergedFilters.endDate || null,
        name: mergedFilters.name || null,
        clanName: mergedFilters.clanName || null,
        world: mergedFilters.world || null,
      };
    });
  };
  const activityTypes: {
    value: ActivitiesControllerFindByGuildTypeItem;
    label: string;
  }[] = [
    {
      value: "CONNECT_EVENT",
      label: t("activityLogs.filters.types.CONNECT_EVENT"),
    },
    {
      value: "DISCONNECT_EVENT",
      label: t("activityLogs.filters.types.DISCONNECT_EVENT"),
    },
  ];
  const activitySources: {
    value: ActivitiesControllerFindByGuildSourceItem;
    label: string;
  }[] = [
    { value: "GAME", label: t("activityLogs.filters.sources.GAME") },
    {
      value: "WEB_APP",
      label: t("activityLogs.filters.sources.WEB_APP"),
    },
  ];

  return (
    <div
      className={cn(
        "w-[320px] h-full flex flex-col shrink-0 bg-background py-3 pr-3",
        className,
      )}
    >
      <Card className="flex-1 flex flex-col min-h-0 bg-filters-sidebar border-border  p-0">
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
                            checked={filters.types.includes(type.value)}
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
                            checked={filters.sources.includes(source.value)}
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
            <motion.div
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
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
};
