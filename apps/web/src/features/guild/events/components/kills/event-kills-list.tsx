import { useTranslation } from "react-i18next";
import { Skull } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { EventKillRow } from "./event-kill-row";

type EventKillsListProps = {
  kills: HeroKill[];
  guildId: string;
  eventId: string;
  isLoading: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown> | unknown;
};

export const EventKillsList = ({
  kills,
  guildId,
  eventId,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: EventKillsListProps) => {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (kills.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center text-muted-foreground">
        <Skull className="mb-2 size-6 opacity-50" />
        <p className="text-sm">{t("events.kills.noKills")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {kills.map((kill) => (
        <EventKillRow
          key={kill.id}
          kill={kill}
          guildId={guildId}
          eventId={eventId}
        />
      ))}

      <div className="flex min-h-10 items-center justify-center border-t border-border/70 pt-2">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Spinner className="size-3" />
            <span className="text-xs">{t("events.kills.loading")}</span>
          </div>
        ) : hasNextPage ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchNextPage()}
            className="min-h-9 text-xs"
          >
            {t("events.kills.loadMore")}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("events.kills.endOfList")}
          </p>
        )}
      </div>
    </div>
  );
};
