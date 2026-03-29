import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";

export type TimeBucket = "24h" | "3d" | "7d" | "30d" | "all";

const TIME_BUCKETS: TimeBucket[] = ["24h", "3d", "7d", "30d", "all"];

type TimeBucketSelectProps = {
  value: TimeBucket;
  onValueChange: (value: TimeBucket) => void;
  className?: string;
  size?: "sm" | "default";
};

export const TimeBucketSelect: React.FC<TimeBucketSelectProps> = ({
  value,
  onValueChange,
  className = "w-[120px]",
  size,
}) => {
  const { t } = useTranslation();

  const labelMap: Record<TimeBucket, string> = {
    "24h": t("kills.filters.timeBucket24h"),
    "3d": t("kills.filters.timeBucket3d"),
    "7d": t("kills.filters.timeBucket7d"),
    "30d": t("kills.filters.timeBucket30d"),
    all: t("kills.filters.timeBucketAll"),
  };

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger size={size} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_BUCKETS.map((bucket) => (
          <SelectItem key={bucket} value={bucket}>
            {labelMap[bucket]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
