import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { Label } from "@lootlog/ui/components/label";
import { isBefore, startOfDay } from "date-fns";
import { useTranslation } from "react-i18next";
import type { useActivityLogsFilterModel } from "./use-activity-logs-filter-model";

type ActivityLogsDateRangeFieldsProps = Pick<
  ReturnType<typeof useActivityLogsFilterModel>,
  | "filters"
  | "updateFilters"
  | "startDateValue"
  | "endDateValue"
  | "isStartDateDisabled"
  | "isEndDateDisabled"
> & {
  labelClassName?: string;
};

export const ActivityLogsDateRangeFields = ({
  filters,
  updateFilters,
  startDateValue,
  endDateValue,
  isStartDateDisabled,
  isEndDateDisabled,
  labelClassName,
}: ActivityLogsDateRangeFieldsProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="space-y-2">
        <Label className={labelClassName}>
          {t("activityLogs.filters.startDate")}
        </Label>
        <DateTimePicker
          value={startDateValue}
          onChange={(date) => {
            // An end date before the new start would match nothing.
            const shouldClearEndDate =
              date &&
              endDateValue &&
              isBefore(startOfDay(endDateValue), startOfDay(date));

            updateFilters({
              startDate: date?.toISOString() ?? "",
              endDate: shouldClearEndDate ? "" : filters.endDate,
            });
          }}
          placeholder={t("activityLogs.filters.startDatePlaceholder")}
          className="h-10 w-full"
          disabled={isStartDateDisabled}
        />
      </div>
      <div className="space-y-2">
        <Label className={labelClassName}>
          {t("activityLogs.filters.endDate")}
        </Label>
        <DateTimePicker
          value={endDateValue}
          onChange={(date) =>
            updateFilters({ endDate: date?.toISOString() ?? "" })
          }
          placeholder={t("activityLogs.filters.endDatePlaceholder")}
          className="h-10 w-full"
          disabled={isEndDateDisabled}
        />
      </div>
    </>
  );
};
