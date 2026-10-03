import { KpiCard } from "@/components/common/kpi-card";
import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import { Skull, Swords } from "lucide-react";
import { EventHeroContext } from "../shared/event-hero-context";

type EventKillsSummaryProps = {
  eventName: string;
  heroName?: string;
  killCount?: number;
  isKillCountLoading?: boolean;
};

export const EventKillsSummary = ({
  eventName,
  heroName,
  killCount,
  isKillCountLoading = false,
}: EventKillsSummaryProps) => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        icon={Skull}
        title={t("events.kills.title")}
        description={eventName}
        metadata={<EventHeroContext heroName={heroName} />}
      />
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
    </>
  );
};
