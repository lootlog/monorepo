import { useTranslation } from "react-i18next";
import { Skull } from "lucide-react";

type EventKillsSummaryProps = {
  eventName: string;
  heroName?: string;
};

export const EventKillsSummary = ({
  eventName,
  heroName,
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
    </section>
  );
};
