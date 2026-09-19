import type { FilterChip } from "@/components/common/filter-chip-list";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import type {
  ActivitiesControllerFindByGuildSourceItem as ActivitySource,
  ActivitiesControllerFindByGuildTypeItem as ActivityType,
} from "@lootlog/client/activity";
import { format } from "date-fns";
import type { TFunction } from "i18next";

type ActivityLogsChipFilters = {
  name: string;
  clanName: string;
  world: string;
  startDate: string;
  endDate: string;
};

type BuildActivityLogsFilterChipsOptions = {
  filters: ActivityLogsChipFilters;
  selectedTypes: ActivityType[];
  selectedSources: ActivitySource[];
  updateFilters: (
    filters: Partial<
      ActivityLogsChipFilters & { types: string[]; sources: string[] }
    >,
  ) => void;
  translate: TFunction;
};

const formatChipDate = (value: string) =>
  format(new Date(value), "dd.MM.yyyy HH:mm");

export const buildActivityLogsFilterChips = ({
  filters,
  selectedTypes,
  selectedSources,
  updateFilters,
  translate: t,
}: BuildActivityLogsFilterChipsOptions): FilterChip[] => {
  const textChips = [
    { id: "name", key: "player", value: filters.name },
    { id: "clanName", key: "clan", value: filters.clanName },
    {
      id: "world",
      key: "world",
      value: filters.world && capitalizeFirstLetter(filters.world),
    },
  ] as const;

  const dateChips = [
    { id: "startDate", key: "from", value: filters.startDate },
    { id: "endDate", key: "to", value: filters.endDate },
  ] as const;

  return [
    ...textChips.flatMap((chip) =>
      chip.value
        ? [
            {
              id: chip.id,
              label: t(`activityLogs.filters.chips.${chip.key}`, {
                value: chip.value,
              }),
              onRemove: () => updateFilters({ [chip.id]: "" }),
            },
          ]
        : [],
    ),
    ...selectedTypes.map((type) => ({
      id: `type:${type}`,
      label: t(`activityLogs.filters.types.${type}`),
      onRemove: () =>
        updateFilters({
          types: selectedTypes.filter((selected) => selected !== type),
        }),
    })),
    ...selectedSources.map((source) => ({
      id: `source:${source}`,
      label: t(`activityLogs.filters.sources.${source}`),
      onRemove: () =>
        updateFilters({
          sources: selectedSources.filter((selected) => selected !== source),
        }),
    })),
    ...dateChips.flatMap((chip) =>
      chip.value
        ? [
            {
              id: chip.id,
              label: t(`activityLogs.filters.chips.${chip.key}`, {
                value: formatChipDate(chip.value),
              }),
              onRemove: () => updateFilters({ [chip.id]: "" }),
            },
          ]
        : [],
    ),
  ];
};
