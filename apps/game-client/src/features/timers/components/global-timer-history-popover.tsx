import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import {
  getTimersControllerGetRecentTimerHistoryQueryKey,
  useTimersControllerGetRecentTimerHistory,
  useTimersControllerRestoreTimerFromHistory,
} from "@/lib/api/generated/main/timers/timers";
import { format } from "date-fns";
import { History, Loader2, RotateCcw } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type GlobalTimerHistoryPopoverProps = {
  world: string;
};

const getCharacterLabel = (
  actorCharacter: NonNullable<TimerHistoryResponseDto["actorCharacter"]>,
) => {
  return `${actorCharacter.name} (${actorCharacter.lvl ?? ""}${actorCharacter.prof?.charAt(0).toLowerCase() ?? ""})`;
};

const getActorLabel = (entry: TimerHistoryResponseDto) => {
  if (!entry.actorCharacter) {
    return entry.member.name;
  }

  return `${entry.member.name} - ${getCharacterLabel(entry.actorCharacter)}`;
};

export const GlobalTimerHistoryPopover: FC<GlobalTimerHistoryPopoverProps> = ({
  world,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { upsertTimer } = useTimersCache();
  const { mutate: restoreTimer, isPending: restorePending } =
    useTimersControllerRestoreTimerFromHistory();
  const { data: history = [], isLoading } =
    useTimersControllerGetRecentTimerHistory(
      {
        world,
        limit: 5,
      },
      {
        query: {
          queryKey: getTimersControllerGetRecentTimerHistoryQueryKey({
            world,
            limit: 5,
          }),
          enabled: open && !!world,
        },
      },
    );

  const handleRestore = (entry: TimerHistoryResponseDto) => {
    restoreTimer(
      {
        pathParams: {
          guildId: entry.guildId,
          historyEntryId: entry.id.toString(),
        },
      },
      {
        onSuccess: (timer) => {
          upsertTimer(normalizeTimerResponse(timer));
          window.message?.(t("history.restoreSuccess"));
        },
        onError: () => {
          window.message?.(t("history.restoreFailed"));
        },
      },
    );
  };

  const historyLabel = t("toolbar.history");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={historyLabel}
          className="ll-custom-cursor-pointer ll:mt-0.5 ll:border-0 ll:bg-transparent ll:p-0 ll:leading-none ll:text-gray-300 ll:hover:text-gray-100 ll:transition-colors"
          title={historyLabel}
          type="button"
        >
          <History className="ll:h-3.5 ll:w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="ll:w-80 ll:p-2" align="end" side="bottom">
        <div className="ll:flex ll:flex-col ll:gap-2 ll:text-xs">
          <div className="ll:font-semibold ll:text-white">
            {t("history.globalTitle")}
          </div>
          {isLoading && (
            <div className="ll:flex ll:items-center ll:gap-2 ll:text-gray-300">
              <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin" />
              {t("history.loading")}
            </div>
          )}
          {!isLoading && history.length === 0 && (
            <div className="ll:text-gray-400">{t("history.empty")}</div>
          )}
          {!isLoading && history.length > 0 && (
            <div className="ll:flex ll:flex-col ll:gap-1.5">
              {history.map((entry) => (
                <div
                  className="ll:flex ll:items-start ll:justify-between ll:gap-2 ll:border-b ll:border-gray-700 ll:pb-1.5 last:ll:border-b-0 last:ll:pb-0"
                  key={entry.id}
                >
                  <div className="ll:flex ll:flex-col ll:gap-0.5 ll:min-w-0">
                    <div className="ll:flex ll:items-center ll:gap-2">
                      <span className="ll:font-semibold ll:text-white">
                        {t(`history.actions.${entry.action.toLowerCase()}`)}
                      </span>
                      <span className="ll:text-gray-500">
                        {format(new Date(entry.createdAt), "dd.MM HH:mm:ss")}
                      </span>
                    </div>
                    <span className="ll:text-gray-300 ll:truncate">
                      {entry.npc?.name ?? entry.timerKey}
                    </span>
                    <span className="ll:text-gray-400 ll:truncate">
                      {getActorLabel(entry)}
                    </span>
                  </div>
                  {entry.canRestore && (
                    <Button
                      className="ll:h-6 ll:px-1.5 ll:shrink-0"
                      disabled={restorePending}
                      onClick={() => handleRestore(entry)}
                      type="button"
                      variant="ghost"
                    >
                      <RotateCcw className="ll:h-3.5 ll:w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
