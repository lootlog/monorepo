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
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <ActorNameSelector
        value={filters.name ?? ""}
        suggestions={nameSuggestions}
        searchValue={filters.name ?? ""}
        onSearchChange={(value) => updateFilters({ name: value })}
        onValueChange={(value) => updateFilters({ name: value })}
        placeholder={t("activityLogs.filters.nameSearchPlaceholder")}
        className="min-w-0 flex-1 md:min-w-60"
      />

      <div className="md:hidden">
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

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <ActivityLogsFilterFields model={model} />
      </div>
    </div>
  );
};
