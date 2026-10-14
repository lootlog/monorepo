import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { useTranslation } from "react-i18next";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";

export type ReservationFilter = "all" | "available" | "pinned" | "partners";

type ReservationFiltersProps = {
  value: ReservationFilter;
  onChange: (value: ReservationFilter) => void;
};

const FILTERS = ["available", "pinned", "partners"] as const;

/** Pills that narrow the spots to one kind; pressing the active one shows all. */
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
      value={value === "all" ? [] : [value]}
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
