import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tile } from "@/components/ui/tile";
import {
  getTimersControllerGetTimerHistoryQueryKey,
  useTimersControllerGetTimerHistory,
  useTimersControllerRestoreTimerFromHistory,
} from "@/lib/api/generated/main/timers/timers";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { format } from "date-fns";
import { History, Loader2, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { normalizeTimerResponse } from "@/api/timers.api";
import { useTimersCache } from "@/hooks/api/use-timers-cache";
import { cn } from "@/lib/utils";

type TimerHistoryPopoverProps = {
  timer: TimerWithTimeLeft;
};

const getCharacterLabel = (
  actorCharacter: NonNullable<TimerHistoryResponseDto["actorCharacter"]>,
) => {
  return `${actorCharacter.name} (${actorCharacter.lvl ?? ""}${actorCharacter.prof?.charAt(0).toLowerCase() ?? ""})`;
};

const getEntryMainLabel = (entry: TimerHistoryResponseDto) => {
  return `${entry.member.name} (${entry.guildName})`;
};

const ACTION_CONFIG = {
  CREATE: {
    Icon: Plus,
    iconClassName: "ll:text-emerald-300",
    borderColor: "#34d399",
    backgroundColor: "#064e3b66",
  },
  RESET: {
    Icon: RotateCcw,
    iconClassName: "ll:text-sky-300",
    borderColor: "#38bdf8",
    backgroundColor: "#0c4a6e66",
  },
  DELETE: {
    Icon: Trash2,
    iconClassName: "ll:text-red-300",
    borderColor: "#f87171",
    backgroundColor: "#7f1d1d66",
  },
  RESTORE: {
    Icon: Undo2,
    iconClassName: "ll:text-teal-300",
    borderColor: "#2dd4bf",
    backgroundColor: "#134e4a66",
  },
} satisfies Record<
  TimerHistoryResponseDto["action"],
  {
    Icon: typeof Plus;
    iconClassName: string;
    borderColor: string;
    backgroundColor: string;
  }
>;

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
        className="ll:w-80 ll:p-1"
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
          <div className="ll:font-semibold ll:text-white ll:pt-1">
            {t("history.title")} {timer.npc?.name ? `- ${timer.npc.name}` : ""}
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
            <div className="ll:flex ll:flex-col ll:gap-1">
              {history.map((entry) => {
                const actionConfig = ACTION_CONFIG[entry.action];
                const ActionIcon = actionConfig.Icon;

                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>
                      <span className="ll:block">
                        <Tile
                          customBackgroundColor={actionConfig.backgroundColor}
                          customBorderColor={actionConfig.borderColor}
                          className="ll:h-7 ll:px-1 ll:justify-start ll:gap-1.5"
                        >
                          <ActionIcon
                            className={cn(
                              "ll:h-3.5 ll:w-3.5 ll:shrink-0",
                              actionConfig.iconClassName,
                            )}
                          />
                          <span className="ll:min-w-0 ll:flex-1 ll:truncate ll:text-[11px] ll:font-semibold ll:text-white">
                            {getEntryMainLabel(entry)}
                          </span>
                          {entry.canRestore && (
                            <Button
                              aria-label={t("history.restore")}
                              className="ll:h-5 ll:w-5 ll:p-0 ll:shrink-0 ll:text-gray-200 hover:ll:text-white"
                              disabled={restorePending}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleRestore(entry);
                              }}
                              title={t("history.restore")}
                              type="button"
                              variant="ghost"
                            >
                              <RotateCcw className="ll:h-3 ll:w-3" />
                            </Button>
                          )}
                          <span className="ll:ml-auto ll:shrink-0 ll:text-[10px] ll:text-gray-300">
                            {format(
                              new Date(entry.createdAt),
                              "dd.MM HH:mm:ss",
                            )}
                          </span>
                        </Tile>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="ll:w-72 ll:max-w-72 ll:overflow-hidden ll:p-0 ll:text-left ll:shadow-lg"
                    >
                      <div className="ll:bg-black/35 ll:p-2">
                        <div className="ll:flex ll:items-center ll:gap-2">
                          <span className="ll:flex ll:h-6 ll:w-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:bg-black/35">
                            <ActionIcon
                              className={cn(
                                "ll:h-4 ll:w-4",
                                actionConfig.iconClassName,
                              )}
                            />
                          </span>
                          <div className="ll:min-w-0 ll:flex-1">
                            <div className="ll:text-[11px] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-white">
                              {t(
                                `history.actions.${entry.action.toLowerCase()}`,
                              )}
                            </div>
                            <div className="ll:truncate ll:text-[10px] ll:text-gray-300">
                              {format(
                                new Date(entry.createdAt),
                                "dd.MM.yyyy HH:mm:ss",
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ll:mt-2 ll:border-t ll:border-white/10 ll:pt-2">
                          <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
                            {t("history.details.npc")}
                          </div>
                          <div className="ll:truncate ll:text-sm ll:font-semibold ll:text-white">
                            {entry.npc?.name ?? entry.timerKey}
                          </div>
                        </div>

                        <div className="ll:mt-2 ll:grid ll:gap-1 ll:border-t ll:border-white/10 ll:pt-2">
                          <div className="ll:min-w-0">
                            <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
                              {t("history.details.member")}
                            </div>
                            <div className="ll:truncate ll:text-[11px] ll:font-semibold ll:text-white">
                              {getEntryMainLabel(entry)}
                            </div>
                          </div>
                          {entry.actorCharacter && (
                            <div className="ll:min-w-0">
                              <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
                                {t("history.details.character")}
                              </div>
                              <div className="ll:truncate ll:text-[11px] ll:text-gray-100">
                                {getCharacterLabel(entry.actorCharacter)}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ll:mt-2 ll:grid ll:grid-cols-2 ll:gap-x-2 ll:gap-y-1 ll:border-t ll:border-white/10 ll:pt-2 ll:text-[10px]">
                          <span className="ll:text-gray-400">
                            {t("history.details.world")}
                          </span>
                          <span className="ll:truncate ll:text-right ll:text-gray-100">
                            {entry.world}
                          </span>
                          {entry.minSpawnTime && (
                            <>
                              <span className="ll:text-gray-400">
                                {t("history.details.min")}
                              </span>
                              <span className="ll:text-right ll:text-gray-100">
                                {format(
                                  new Date(entry.minSpawnTime),
                                  "dd.MM HH:mm:ss",
                                )}
                              </span>
                            </>
                          )}
                          {entry.maxSpawnTime && (
                            <>
                              <span className="ll:text-gray-400">
                                {t("history.details.max")}
                              </span>
                              <span className="ll:text-right ll:text-gray-100">
                                {format(
                                  new Date(entry.maxSpawnTime),
                                  "dd.MM HH:mm:ss",
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
