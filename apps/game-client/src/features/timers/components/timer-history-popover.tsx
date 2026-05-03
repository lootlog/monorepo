import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getTimersControllerGetTimerHistoryQueryKey,
  useTimersControllerGetTimerHistory,
  useTimersControllerRestoreTimerFromHistory,
} from "@/lib/api/generated/main/timers/timers";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { format } from "date-fns";
import { History, Loader2, RotateCcw } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";

type TimerHistoryPopoverProps = {
  timer: TimerWithTimeLeft;
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

export const TimerHistoryPopover: FC<TimerHistoryPopoverProps> = ({
  timer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { upsertTimer } = useTimersCache();
  const { mutate: restoreTimer, isPending: restorePending } =
    useTimersControllerRestoreTimerFromHistory();
  const { data: history = [], isLoading } = useTimersControllerGetTimerHistory(
    {
      guildId: timer.guildId,
      timerIdentifier: timer.timerKey,
    },
    {
      world: timer.world,
      limit: 5,
    },
    {
      query: {
        queryKey: getTimersControllerGetTimerHistoryQueryKey(
          {
            guildId: timer.guildId,
            timerIdentifier: timer.timerKey,
          },
          {
            world: timer.world,
            limit: 5,
          },
        ),
        enabled: open,
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
        onSuccess: (restoredTimer) => {
          upsertTimer(normalizeTimerResponse(restoredTimer));
          window.message?.(t("history.restoreSuccess"));
          setOpen(false);
        },
        onError: () => {
          window.message?.(t("history.restoreFailed"));
        },
      },
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ContextMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <History className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.history")}
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent
        className="ll:w-72 ll:p-2"
        align="start"
        side="right"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (
            event.target instanceof Element &&
            event.target.closest('[role="menu"]')
          ) {
            event.preventDefault();
          }
        }}
      >
        <div className="ll:flex ll:flex-col ll:gap-2 ll:text-xs">
          <div className="ll:font-semibold ll:text-white">
            {t("history.title")}
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
                  className="ll:flex ll:items-start ll:justify-between ll:gap-2 ll:border-b ll:border-gray-700 ll:pb-1 last:ll:border-b-0 last:ll:pb-0"
                  key={entry.id}
                >
                  <div className="ll:flex ll:flex-col ll:gap-0.5 ll:min-w-0">
                    <div className="ll:flex ll:items-center ll:justify-between ll:gap-2">
                      <span className="ll:font-semibold ll:text-white">
                        {t(`history.actions.${entry.action.toLowerCase()}`)}
                      </span>
                      <span className="ll:text-gray-500">
                        {format(new Date(entry.createdAt), "dd.MM HH:mm:ss")}
                      </span>
                    </div>
                    <span className="ll:text-gray-300">
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
