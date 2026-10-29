import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useTranslation } from "react-i18next";
import { FILTER_PILL_CLASS } from "@lootlog/ui/lib/filter-pill";

export type ReservationFilter = "all" | "available" | "pinned" | "partners";

type ReservationFiltersProps = {
  value: ReservationFilter;
  onChange: (value: ReservationFilter) => void;
};

const FILTERS = ["all", "available", "pinned", "partners"] as const;

/**
 * Pills that show every spot or narrow them to one kind; pressing the active
 * one shows every spot again.
 */
export function ReservationFilters({
  value,
  onChange,
}: ReservationFiltersProps) {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={1.5}
      value={[value]}
      onValueChange={(values) =>
        onChange(FILTERS.find((filter) => filter === values[0]) ?? "all")
      }
      aria-label={t("reservations.filters.label")}
      className="flex-wrap"
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem
          key={filter}
          value={filter}
          className={FILTER_PILL_CLASS}
        >
          {t(`reservations.filters.${filter}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
