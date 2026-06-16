import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";

export type KillStatsPeriod = "all" | "24h" | "3d" | "7d" | "14d" | "30d";

const KILL_STATS_PERIODS: KillStatsPeriod[] = [
  "all",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
];

type KillStatsPeriodSelectProps = {
  value: KillStatsPeriod;
  onValueChange: (value: KillStatsPeriod) => void;
  className?: string;
};

export const KillStatsPeriodSelect: React.FC<KillStatsPeriodSelectProps> = ({
  value,
  onValueChange,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as KillStatsPeriod)}
    >
      <SelectTrigger className={className ?? "w-[140px]"}>
        <div className="flex items-center gap-2">
          <CalendarRange className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder={t("kills.filters.period")} />
        </div>
      </SelectTrigger>
      <SelectContent>
        {KILL_STATS_PERIODS.map((period) => (
          <SelectItem key={period} value={period}>
            {t(`kills.period.${period}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
