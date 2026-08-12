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
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border/80 bg-card">
      <div className="flex min-w-0 items-center gap-3 p-3 md:px-4 md:py-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/15">
          <Skull className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium leading-none text-muted-foreground">
            {t("events.kills.title")}
          </p>
          <h1 className="mt-1 truncate text-base font-semibold leading-none">
            {eventName}
          </h1>
          <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
            {heroName ?? t("events.kills.allHeroes")}
          </p>
        </div>
      </div>

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
                —
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
};
