import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { Button } from "@lootlog/ui/components/button";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Label } from "@lootlog/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@lootlog/ui/components/popover";
import {
  Activity,
  CalendarRange,
  Globe,
  MonitorSmartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityLogsDateRangeFields } from "./activity-logs-date-range-fields";
import { ActorNameSelector } from "./actor-name-selector";
import type { useActivityLogsFilterModel } from "./use-activity-logs-filter-model";

type ActivityLogsFilterFieldsProps = {
  model: ReturnType<typeof useActivityLogsFilterModel>;
  /** Labelled, full-width fields for the mobile drawer instead of the toolbar row. */
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
    worlds,
    clanNameSuggestions,
    activityTypes,
    activitySources,
    selectedTypes,
    selectedSources,
  } = model;

  const renderField = (label: string, control: ReactNode) =>
    stacked ? (
      <div className="space-y-2">
        <Label>{label}</Label>
        {control}
      </div>
    ) : (
      control
    );

  const renderSelectedCount = (placeholder: string) => (count: number) =>
    count > 0
      ? t("activityLogs.filters.selectedCount", { count })
      : placeholder;

  const dateRangeFields = (
    <ActivityLogsDateRangeFields
      filters={filters}
      updateFilters={updateFilters}
      startDateValue={model.startDateValue}
      endDateValue={model.endDateValue}
      isStartDateDisabled={model.isStartDateDisabled}
      isEndDateDisabled={model.isEndDateDisabled}
      labelClassName={stacked ? undefined : "text-xs text-muted-foreground"}
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
          className={stacked ? "w-full" : "w-[200px]"}
        />,
      )}
      {renderField(
        t("activityLogs.filters.world"),
        <FilterPopover
          options={worlds.map((world) => ({
            value: world,
            label: capitalizeFirstLetter(world),
          }))}
          value={filters.world || undefined}
          onValueChange={(world) =>
            updateFilters({ world: world === filters.world ? "" : world })
          }
          placeholder={t("activityLogs.filters.world")}
          icon={Globe}
          width={stacked ? "w-full" : "w-[150px]"}
          searchPlaceholder={t("activityLogs.filters.worldSearchPlaceholder")}
          emptyMessage={t("activityLogs.filters.noWorlds")}
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
          width={stacked ? "w-full" : "w-[160px]"}
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
          width={stacked ? "w-full" : "w-[160px]"}
          multiSelect
          showSearch={false}
          renderTriggerLabel={renderSelectedCount(
            t("activityLogs.filters.source"),
          )}
        />,
      )}
      {stacked ? (
        dateRangeFields
      ) : (
        <Popover>
          <PopoverTrigger
            render={
              <Button type="button" variant="outline" className="h-10 gap-2">
                <CalendarRange className="size-4" aria-hidden="true" />
                {t("activityLogs.filters.dateRange")}
              </Button>
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
