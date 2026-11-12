import { useTranslation } from "react-i18next";
import { RelativeTime } from "@/components/common/relative-time";
import { useMinuteTimestamp } from "@/hooks/utils/use-minute-timestamp";

type StatsComputedAtProps = {
  /** When the API computed the statistics, an ISO timestamp; unset while loading. */
  computedAt: string | undefined;
};

/**
 * Lootlog statistics read the whole history, so the API serves them for hours
 * and refreshes them in the background. This says how old the numbers are.
 */
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
