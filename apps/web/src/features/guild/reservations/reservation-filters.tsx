import { useTranslation } from "react-i18next";
import { cn } from "@lootlog/ui/lib/utils";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";

export type ReservationFilter = "all" | "available" | "pinned" | "partners";

type ReservationFiltersProps = {
  value: ReservationFilter;
  onChange: (value: ReservationFilter) => void;
  className?: string;
};

const FILTERS: ReservationFilter[] = ["all", "available", "pinned", "partners"];

export function ReservationFilters({
  value,
  onChange,
  className,
}: ReservationFiltersProps) {
  const { t } = useTranslation();

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={t("reservations.filters.label")}
      className={cn(
        "w-full max-w-full overflow-x-auto xl:w-fit xl:overflow-visible",
        className,
      )}
    >
      {FILTERS.map((filter) => (
        <ToggleGroupItem
          key={filter}
          pressed={value === filter}
          onPressedChange={() => onChange(filter)}
          aria-label={t(`reservations.filters.${filter}`)}
          className="h-9 min-w-max flex-1 xl:flex-none"
        >
          {filter === "partners" ? (
            <>
              <span className="sm:hidden">
                {t("reservations.filters.partnersCompact")}
              </span>
              <span className="hidden sm:inline">
                {t("reservations.filters.partners")}
              </span>
            </>
          ) : (
            t(`reservations.filters.${filter}`)
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
