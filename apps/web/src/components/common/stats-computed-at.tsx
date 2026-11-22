import { useTranslation } from "react-i18next";
import { RelativeTime } from "@/components/common/relative-time";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";

type StatsComputedAtProps = {
  computedAt: string | undefined;
};

export const StatsComputedAt = ({ computedAt }: StatsComputedAtProps) => {
  const { t } = useTranslation();
  const now = useMinuteTimestamp();

  if (!computedAt) return null;

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 border-b border-border px-4 py-2 text-xs text-muted-foreground sm:px-6">
      {t("common.stats.computedAt")}
      <RelativeTime at={computedAt} now={now} />
    </p>
  );
};
