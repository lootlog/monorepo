import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { ArrowDownUp, ListOrdered } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import type { StatisticsSort, StatisticsSortTab } from "./statistics-search";
import type { StatisticsSortValue } from "./statistics-sort";

type StatisticsSortSelectProps = {
  tab: StatisticsSortTab;
  fields: readonly StatisticsSort[];
  value: StatisticsSortValue;
  onValueChange: (value: StatisticsSortValue) => void;
};

/** The ranking's sort in the filter panel of narrow pages, which show no table headers. */
export function StatisticsSortSelect({
  tab,
  fields,
  value,
  onValueChange,
}: StatisticsSortSelectProps) {
  const { t } = useTranslation();

  return (
    <>
      <FilterPanelField label={t("statistics.sort.by")}>
        <FilterPopover
          icon={ListOrdered}
          options={fields.map((field) => ({
            value: field,
            label: t(`statistics.sort.fields.${tab}.${field}`),
          }))}
          value={value.field}
          onValueChange={(next) => {
            const field = fields.find((option) => option === next);

            if (field) onValueChange({ field, asc: value.asc });
          }}
          placeholder={t("statistics.sort.by")}
          emptyMessage={t("common.noResults")}
          width="w-full"
          showSearch={false}
          active={value.field !== fields[0]}
        />
      </FilterPanelField>
      <FilterPanelField label={t("statistics.sort.order")}>
        <FilterPopover
          icon={ArrowDownUp}
          options={[
            { value: "desc", label: t("statistics.sort.desc") },
            { value: "asc", label: t("statistics.sort.asc") },
          ]}
          value={value.asc ? "asc" : "desc"}
          onValueChange={(next) =>
            onValueChange({ field: value.field, asc: next === "asc" })
          }
          placeholder={t("statistics.sort.order")}
          emptyMessage={t("common.noResults")}
          width="w-full"
          showSearch={false}
          active={value.asc}
        />
      </FilterPanelField>
    </>
  );
}
