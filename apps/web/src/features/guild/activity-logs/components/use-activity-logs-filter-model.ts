import {
  type ActivitiesControllerFindByGuildSourceItem,
  type ActivitiesControllerFindByGuildTypeItem,
  getActivitiesControllerSuggestActorNamesQueryKey,
  getActivitiesControllerSuggestActorNamesQueryOptions,
  getActivitiesControllerSuggestClanNamesQueryKey,
  getActivitiesControllerSuggestClanNamesQueryOptions,
} from "@lootlog/client/activity";

import { useGuildId } from "@/hooks/context/use-guild-id";
import { useActivityLogsFilters } from "@/hooks/use-activity-logs-filters";
import { useGuildsControllerGetGuildById } from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";
import { isAfter, isBefore, startOfDay, subDays } from "date-fns";
import {
  getActivityLogSources,
  getActivityLogTypes,
} from "../activity-logs.queries";

import { useTranslation } from "react-i18next";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";

type ActivityLogsFiltersSidebarProps = {
  className?: string;
};

const optionalText = (value: string) => (value.length > 0 ? value : undefined);

const getDateValue = (value: string | null | undefined) =>
  value ? new Date(value) : undefined;

export const useActivityLogsFilterModel = ({
  className,
}: ActivityLogsFiltersSidebarProps) => {
  const { t } = useTranslation();
  const { filters, setFilters, clearFilters, hasActiveFilters } =
    useActivityLogsFilters();
  const guildId = useGuildId();
  const debouncedNameSearch = useDebounce(filters.name ?? "", 300);
  const debouncedClanSearch = useDebounce(filters.clanName ?? "", 300);
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

  return {
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
  };
};
