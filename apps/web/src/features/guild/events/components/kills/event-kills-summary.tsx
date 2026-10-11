import { KpiCard } from "@/components/common/kpi-card";
import { useTranslation } from "react-i18next";
import { Swords } from "lucide-react";

type EventKillsSummaryProps = {
  killCount?: number;
  isKillCountLoading?: boolean;
};

export const EventKillsSummary = ({
  killCount,
  isKillCountLoading = false,
}: EventKillsSummaryProps) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        icon={Swords}
        label={t("events.kills.killCount")}
        isLoading={isKillCountLoading}
        value={
          killCount ?? (
            <span
              aria-label={t("events.kills.statsUnavailable")}
              title={t("events.kills.statsUnavailable")}
            >
              –
            </span>
          )
        }
      />
    </div>
  );
};
