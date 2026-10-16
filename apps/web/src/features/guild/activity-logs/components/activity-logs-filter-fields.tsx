import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { FilterChipTrigger } from "@lootlog/ui/components/filter-chip-trigger";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import { Activity, CalendarRange, MonitorSmartphone } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityLogsDateRangeFields } from "./activity-logs-date-range-fields";
import { ActorNameSelector } from "./actor-name-selector";
import type { useActivityLogsFilterModel } from "./use-activity-logs-filter-model";

const dayFormatter = new Intl.DateTimeFormat("pl-PL");

type ActivityLogsFilterFieldsProps = {
  model: ReturnType<typeof useActivityLogsFilterModel>;
  /** Full-width `FilterPanelField` sections for the filters panel instead of the bar. */
  stacked?: boolean;
};

export const ActivityLogsFilterFields = ({
  model,
  stacked = false,
}: ActivityLogsFilterFieldsProps) => {
  const { t } = useTranslation();

  const {
    filters,
    updateFilters,
    clanNameSuggestions,
    activityTypes,
    activitySources,
    selectedTypes,
    selectedSources,
  } = model;

  const renderField = (label: string, control: ReactNode) =>
    stacked ? (
      <FilterPanelField label={label}>{control}</FilterPanelField>
    ) : (
      control
    );

  const renderSelectedCount = (placeholder: string) => (count: number) =>
    count > 0
      ? t("activityLogs.filters.selectedCount", { count })
      : placeholder;

  const formatDay = (date: Date) => dayFormatter.format(date);

  const { startDateValue, endDateValue } = model;

  const dateRangeValue =
    startDateValue || endDateValue
      ? `${startDateValue ? formatDay(startDateValue) : "…"} – ${endDateValue ? formatDay(endDateValue) : "…"}`
      : undefined;

  const dateRangeFields = (
    <ActivityLogsDateRangeFields
      filters={filters}
      updateFilters={updateFilters}
      startDateValue={model.startDateValue}
      endDateValue={model.endDateValue}
      isStartDateDisabled={model.isStartDateDisabled}
      isEndDateDisabled={model.isEndDateDisabled}
      labelClassName="text-xs text-muted-foreground"
    />
  );

  return (
    <>
      {renderField(
        t("activityLogs.filters.clanName"),
        <ActorNameSelector
          value={filters.clanName ?? ""}
          suggestions={clanNameSuggestions}
          searchValue={filters.clanName ?? ""}
          onSearchChange={(value) => updateFilters({ clanName: value })}
          onValueChange={(value) => updateFilters({ clanName: value })}
          placeholder={t("activityLogs.filters.clanSearchPlaceholder")}
          label={t("activityLogs.filters.clanName")}
          className={stacked ? "w-full" : "w-[200px]"}
        />,
      )}
      {renderField(
        t("activityLogs.filters.type"),
        <FilterPopover
          options={activityTypes}
          value={selectedTypes}
          onValueChange={(type) =>
            updateFilters({
              types: selectedTypes.includes(type)
                ? selectedTypes.filter((selected) => selected !== type)
                : [...selectedTypes, type],
            })
          }
          placeholder={t("activityLogs.filters.typeShort")}
          icon={Activity}
          width={stacked ? "w-full" : "w-[140px]"}
          multiSelect
          showSearch={false}
          renderTriggerLabel={renderSelectedCount(
            t("activityLogs.filters.typeShort"),
          )}
        />,
      )}
      {renderField(
        t("activityLogs.filters.source"),
        <FilterPopover
          options={activitySources}
          value={selectedSources}
          onValueChange={(source) =>
            updateFilters({
              sources: selectedSources.includes(source)
                ? selectedSources.filter((selected) => selected !== source)
                : [...selectedSources, source],
            })
          }
          placeholder={t("activityLogs.filters.source")}
          icon={MonitorSmartphone}
          width={stacked ? "w-full" : "w-[140px]"}
          multiSelect
          showSearch={false}
          renderTriggerLabel={renderSelectedCount(
            t("activityLogs.filters.source"),
          )}
        />,
      )}
      {stacked ? (
        renderField(
          t("activityLogs.filters.dateRange"),
          <div className="flex flex-col gap-4">{dateRangeFields}</div>,
        )
      ) : (
        <Popover>
          <PopoverTrigger
            render={
              <FilterChipTrigger
                type="button"
                icon={CalendarRange}
                label={t("activityLogs.filters.dateRange")}
                value={dateRangeValue}
                active={dateRangeValue !== undefined}
              />
            }
          />
          <PopoverContent align="end" className="w-[300px] p-4">
            <div className="flex flex-col gap-4">{dateRangeFields}</div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );
};
