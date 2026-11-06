import { TextLink } from "@lootlog/ui/components/text-link";
import type { TimerResponseDto } from "@lootlog/client/main";
import type { TimerPhase } from "@lootlog/domain/timers";
import { BookOpen } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { wikiNpcUrl } from "@/config/wiki";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

type TimerDetailsProps = {
  timer: TimerResponseDto;
  phase: TimerPhase;
};

/** A timer's spawn window, with its monster's wiki page. */
export const TimerDetails: FC<TimerDetailsProps> = ({ timer, phase }) => {
  const { t } = useTranslation();

  return (
    <>
      {phase === "entrance" && timer.entranceClosesAt && (
        <div>
          <span className="block text-xs text-muted-foreground">
            {t("timers.details.entranceClosesAt")}
          </span>
          <span className="block text-sm font-semibold tabular-nums">
            {timestampToDate(
              timer.entranceClosesAt,
              DATE_TIME_WITH_SECONDS_FORMAT,
            )}
          </span>
        </div>
      )}
      <div>
        <span className="block text-xs text-muted-foreground">
          {t("timers.details.minSpawnTime")}
        </span>
        <span className="block text-sm font-semibold tabular-nums">
          {timestampToDate(timer.minSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
        </span>
      </div>
      <div>
        <span className="block text-xs text-muted-foreground">
          {t("timers.details.maxSpawnTime")}
        </span>
        <span className="block text-sm font-semibold tabular-nums">
          {timestampToDate(timer.maxSpawnTime, DATE_TIME_WITH_SECONDS_FORMAT)}
        </span>
      </div>
      {timer.npc && (
        <div className="border-t border-border pt-1">
          <TextLink
            href={wikiNpcUrl(timer.npc)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center gap-1.5 text-xs"
          >
            <BookOpen aria-hidden="true" className="size-3.5" />
            {t("timers.details.showOnWiki")}
            <span className="sr-only">{t("ui.externalLink.newTab")}</span>
          </TextLink>
        </div>
      )}
    </>
  );
};
