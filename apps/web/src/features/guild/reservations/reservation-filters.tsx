import { useTranslation } from "react-i18next";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
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
    <AnimatedToggleGroup
      label={t("reservations.filters.label")}
      value={value}
      onValueChange={onChange}
      options={FILTERS.map((filter) => ({
        value: filter,
        label: t(`reservations.filters.${filter}`),
      }))}
      className={cn("w-full xl:w-fit", className)}
    />
  );
}
