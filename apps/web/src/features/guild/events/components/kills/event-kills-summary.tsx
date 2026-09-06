import { PageHeader } from "@/components/common/page-header";
import { useTranslation } from "react-i18next";
import { Skull } from "lucide-react";
import { Skeleton } from "@lootlog/ui/components/skeleton";

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
    <PageHeader
      icon={Skull}
      title={<>{eventName}</>}
      metadata={t("events.kills.title")}
      description={<> {heroName ?? t("events.kills.allHeroes")} </>}
    >
      <dl className="grid grid-cols-1 border-t border-border/80">
        <div className="min-w-0 px-3 py-2 md:px-4">
          <dt className="text-[10px] font-medium text-muted-foreground">
            {t("events.kills.killCount")}
          </dt>
          <dd className="mt-0.5 min-h-5 text-base font-bold leading-5 tabular-nums">
            {isKillCountLoading ? (
              <Skeleton className="h-5 w-8" />
            ) : typeof killCount === "number" ? (
              killCount
            ) : (
              <span
                aria-label={t("events.kills.statsUnavailable")}
                title={t("events.kills.statsUnavailable")}
              >
                -
              </span>
            )}
          </dd>
        </div>
      </dl>
    </PageHeader>
  );
};
