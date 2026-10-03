import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { Button } from "@lootlog/ui/components/button";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ActivityLogsFilterFields } from "./activity-logs-filter-fields";
import { ActorNameSelector } from "./actor-name-selector";
import type { useActivityLogsFilterModel } from "./use-activity-logs-filter-model";

type ActivityLogsFilterToolbarProps = {
  model: ReturnType<typeof useActivityLogsFilterModel>;
};

export const ActivityLogsFilterToolbar = ({
  model,
}: ActivityLogsFilterToolbarProps) => {
  const { t } = useTranslation();
  const { filters, updateFilters, nameSuggestions } = model;

  return (
    // The full filter row needs ~66rem; narrower toolbars use the drawer
    // instead of wrapping the row into several lines.
    <div className="@container/activity-filters w-full min-w-0">
      <div className="flex w-full min-w-0 items-center gap-2">
        <ActorNameSelector
          value={filters.name ?? ""}
          suggestions={nameSuggestions}
          searchValue={filters.name ?? ""}
          onSearchChange={(value) => updateFilters({ name: value })}
          onValueChange={(value) => updateFilters({ name: value })}
          placeholder={t("activityLogs.filters.nameSearchPlaceholder")}
          className="min-w-0 flex-1 @min-[66rem]/activity-filters:min-w-60"
        />

        <div className="@min-[66rem]/activity-filters:hidden">
          <MobileFiltersDrawer
            title={t("activityLogs.filters.title")}
            trigger={
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 gap-2"
              >
                <Filter className="size-4" aria-hidden="true" />
                {t("activityLogs.filters.open")}
              </Button>
            }
          >
            <ActivityLogsFilterFields model={model} stacked />
          </MobileFiltersDrawer>
        </div>

        <div className="hidden items-center gap-2 @min-[66rem]/activity-filters:flex">
          <ActivityLogsFilterFields model={model} />
        </div>
      </div>
    </div>
  );
};
