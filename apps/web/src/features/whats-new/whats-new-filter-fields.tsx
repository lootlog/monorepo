import {
  CHANGELOG_ENTRY_TYPES,
  CHANGELOG_SURFACES,
} from "@lootlog/changelog/changelog";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { MonitorSmartphone, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import type { useWhatsNewFilters } from "@/components/whats-new/use-whats-new-filters";
import { WHATS_NEW_SURFACE_ICONS } from "@/components/whats-new/whats-new-surfaces";

type WhatsNewFilters = ReturnType<typeof useWhatsNewFilters>;

type WhatsNewFilterFieldsProps = {
  filters: WhatsNewFilters["filters"];
  setFilters: WhatsNewFilters["setFilters"];
  /** Full-width `FilterPanelField` sections for the filters panel instead of the bar. */
  stacked?: boolean;
};

const toggle = <Value,>(selected: readonly Value[], value: Value) =>
  selected.includes(value)
    ? selected.filter((current) => current !== value)
    : [...selected, value];

/** Narrows the changes by where the player meets them and by their kind. */
export const WhatsNewFilterFields = ({
  filters,
  setFilters,
  stacked = false,
}: WhatsNewFilterFieldsProps) => {
  const { t } = useTranslation();

  const renderField = (label: string, control: ReactNode) =>
    stacked ? (
      <FilterPanelField label={label}>{control}</FilterPanelField>
    ) : (
      control
    );

  const renderSelectedCount = (placeholder: string) => (count: number) =>
    count > 0
      ? t("layout.whatsNew.filters.selectedCount", { count })
      : placeholder;

  const surfaceLabel = t("layout.whatsNew.filters.surface");
  const typeLabel = t("layout.whatsNew.filters.type");

  return (
    <>
      {renderField(
        surfaceLabel,
        <FilterPopover
          options={CHANGELOG_SURFACES.map((surface) => ({
            value: surface,
            label: t(`layout.whatsNew.surfaces.${surface}`),
            icon: WHATS_NEW_SURFACE_ICONS[surface],
          }))}
          value={filters.surfaces}
          onValueChange={(surface) =>
            setFilters({ surfaces: toggle(filters.surfaces, surface) })
          }
          placeholder={surfaceLabel}
          icon={MonitorSmartphone}
          width={stacked ? "w-full" : undefined}
          multiSelect
          showSearch={false}
          renderTriggerLabel={renderSelectedCount(surfaceLabel)}
        />,
      )}
      {renderField(
        typeLabel,
        <FilterPopover
          options={CHANGELOG_ENTRY_TYPES.map((type) => ({
            value: type,
            label: t(`layout.whatsNew.types.${type}`),
          }))}
          value={filters.types}
          onValueChange={(type) =>
            setFilters({ types: toggle(filters.types, type) })
          }
          placeholder={typeLabel}
          icon={Tag}
          width={stacked ? "w-full" : undefined}
          multiSelect
          showSearch={false}
          renderTriggerLabel={renderSelectedCount(typeLabel)}
        />,
      )}
    </>
  );
};
