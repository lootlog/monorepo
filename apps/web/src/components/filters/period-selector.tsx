import { cn } from "cn";
import { Calendar } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@lootlog/ui/components/select";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useTranslation } from "react-i18next";

interface PeriodSelectorProps {
  value: Period;
  onValueChange: (period: Period) => void;
  excludePeriods?: Period[];
  allLabel?: string;
  placeholder?: string;
  width?: string;
  className?: string;
}

export function PeriodSelector({
  value,
  onValueChange,
  excludePeriods = [],
  allLabel,
  placeholder,
  width = "w-[200px]",
  className,
}: PeriodSelectorProps) {
  const { t } = useTranslation();
  const allPeriods = [
    { value: "24h" as const, label: t("common.periodOptions.24h") },
    { value: "3d" as const, label: t("common.periodOptions.3d") },
    { value: "7d" as const, label: t("common.periodOptions.7d") },
    { value: "14d" as const, label: t("common.periodOptions.14d") },
    { value: "30d" as const, label: t("common.periodOptions.30d") },
    { value: "90d" as const, label: t("common.periodOptions.90d") },
    { value: "180d" as const, label: t("common.periodOptions.180d") },
    {
      value: "all" as const,
      label: allLabel ?? t("common.periodOptions.all"),
    },
  ];
  const availablePeriods = allPeriods.filter(
    (period) => !excludePeriods.includes(period.value),
  );

  return (
    <Select
      items={availablePeriods}
      value={value}
      onValueChange={(period) => {
        if (period !== null) onValueChange(period);
      }}
    >
      <SelectTrigger
        aria-label={placeholder ?? t("common.filterLabels.period")}
        className={cn("h-10", width, className)}
      >
        <Calendar className="size-4" />
        <SelectValue className="min-w-0 flex-1 truncate text-left" />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={width}
      >
        {availablePeriods.map((period) => (
          <SelectItem key={period.value} value={period.value}>
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
