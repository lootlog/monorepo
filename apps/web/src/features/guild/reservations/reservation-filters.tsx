import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ButtonGroup } from "@lootlog/ui/components/button-group";
import { cn } from "cn";

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
    <ButtonGroup
      aria-label={t("reservations.filters.label")}
      className={cn(
        "w-full max-w-full overflow-x-auto xl:w-fit xl:overflow-visible",
        className,
      )}
    >
      {FILTERS.map((filter) => (
        <Button
          key={filter}
          type="button"
          size="sm"
          variant="outline"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
          aria-label={t(`reservations.filters.${filter}`)}
          className="min-w-max flex-1 aria-pressed:bg-secondary aria-pressed:text-secondary-foreground aria-pressed:hover:bg-secondary/80 xl:flex-none"
        >
          {t(`reservations.filters.${filter}`)}
        </Button>
      ))}
    </ButtonGroup>
  );
}
