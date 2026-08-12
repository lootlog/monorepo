import { useTranslation } from "react-i18next";
import { Trophy } from "lucide-react";

type EventRankingSummaryProps = {
  eventName: string;
  selectedHeroName?: string | null;
};

export const EventRankingSummary = ({
  eventName,
  selectedHeroName,
}: EventRankingSummaryProps) => {
  const { t } = useTranslation();

  return (
    <section className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/80 bg-card p-3 md:px-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
        <Trophy className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium leading-none text-muted-foreground">
          {t("events.ranking.title")}
        </p>
        <h1 className="mt-1 truncate text-base font-semibold leading-none">
          {selectedHeroName ?? eventName}
        </h1>
        {selectedHeroName && (
          <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
            {eventName}
          </p>
        )}
      </div>
    </section>
  );
};
