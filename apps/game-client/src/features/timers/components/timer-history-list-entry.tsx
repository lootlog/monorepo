import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimerHistoryResponseDto } from "@/lib/api/generated/main/model";
import { cn } from "@/lib/utils";
import { format } from "@/utils/local-date";
import { Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type TimerHistoryListEntryProps = {
  entry: TimerHistoryResponseDto;
  onRestore: (entry: TimerHistoryResponseDto) => void;
  restorePending: boolean;
  rowLayout: "member" | "npcWithMember";
};

const getCharacterLabel = (
  actorCharacter: NonNullable<TimerHistoryResponseDto["actorCharacter"]>,
) => {
  return `${actorCharacter.name} (${actorCharacter.lvl ?? ""}${actorCharacter.prof?.charAt(0).toLowerCase() ?? ""})`;
};

const getEntryMainLabel = (entry: TimerHistoryResponseDto) => {
  return `${entry.member.name} (${entry.guildName})`;
};

const getNpcLabel = (entry: TimerHistoryResponseDto) => {
  return entry.npc?.name ?? entry.timerKey;
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

export const TimerHistoryListEntry: FC<TimerHistoryListEntryProps> = ({
  entry,
  onRestore,
  restorePending,
  rowLayout,
}) => {
  const { t } = useTranslation("timers");
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const actionConfig = ACTION_CONFIG[entry.action];
  const ActionIcon = actionConfig.Icon;

  return (
    <Tooltip
      open={tooltipOpen}
      onOpenChange={(nextOpen, eventDetails) => {
        if (eventDetails.reason === "outside-press") {
          setTooltipOpen(nextOpen);
        }
      }}
    >
      <TooltipTrigger asChild>
        <span
          className="ll:block"
          onFocus={() => setTooltipOpen(false)}
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onPointerDown={() => setTooltipOpen(false)}
        >
          <Tile
            customBackgroundColor={actionConfig.backgroundColor}
            customBorderColor={actionConfig.borderColor}
            className={cn("ll:h-7 ll:px-1 ll:justify-start ll:gap-1.5", {
              "ll:py-4": rowLayout === "npcWithMember",
            })}
          >
            <ActionIcon
              className={cn(
                "ll:h-3.5 ll:w-3.5 ll:shrink-0",
                actionConfig.iconClassName,
              )}
            />
            <span
              className={cn(
                "ll:flex ll:min-w-0 ll:flex-1 ll:flex-col ll:leading-tight",
              )}
            >
              {rowLayout === "npcWithMember" ? (
                <>
                  <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:font-semibold ll:text-white">
                    {getNpcLabel(entry)}
                  </span>
                  <span className="ll:min-w-0 ll:truncate ll:text-[10px] ll:text-gray-300">
                    {getEntryMainLabel(entry)}
                  </span>
                </>
              ) : (
                <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:font-semibold ll:text-white">
                  {getEntryMainLabel(entry)}
                </span>
              )}
            </span>
            {entry.canRestore && (
              <Button
                aria-label={t("history.restore")}
                className="ll:h-5 ll:w-5 ll:p-0 ll:shrink-0 ll:text-gray-200 hover:ll:text-white"
                disabled={restorePending}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRestore(entry);
                }}
                onFocus={() => setTooltipOpen(false)}
                onMouseEnter={(event) => {
                  event.stopPropagation();
                  setTooltipOpen(false);
                }}
                tabIndex={-1}
                title={t("history.restore")}
                type="button"
                variant="ghost"
              >
                <RotateCcw className="ll:h-3 ll:w-3" />
              </Button>
            )}
            <span className="ll:ml-auto ll:shrink-0 ll:text-[10px] ll:text-gray-300">
              {format(new Date(entry.createdAt), "HH:mm:ss")}
            </span>
          </Tile>
        </span>
      </TooltipTrigger>
      {tooltipOpen && (
        <TooltipContent
          side="right"
          className="ll:w-72 ll:max-w-72 ll:overflow-hidden ll:p-0 ll:text-left ll:shadow-lg"
        >
          <div className="ll:bg-black/35 ll:p-2">
            <div className="ll:flex ll:items-center ll:gap-2">
              <span className="ll:flex ll:h-6 ll:w-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:bg-black/35">
                <ActionIcon
                  className={cn("ll:h-4 ll:w-4", actionConfig.iconClassName)}
                />
              </span>
              <div className="ll:min-w-0 ll:flex-1">
                <div className="ll:text-[11px] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-white">
                  {t(`history.actions.${entry.action.toLowerCase()}`)}
                </div>
                <div className="ll:truncate ll:text-[10px] ll:text-gray-300">
                  {format(new Date(entry.createdAt), "dd.MM.yyyy HH:mm:ss")}
                </div>
              </div>
            </div>

            <div className="ll:mt-2 ll:border-t ll:border-white/10 ll:pt-2">
              <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-gray-400">
                {t("history.details.npc")}
              </div>
              <div className="ll:truncate ll:text-sm ll:font-semibold ll:text-white">
                {getNpcLabel(entry)}
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
                    {format(new Date(entry.minSpawnTime), "dd.MM HH:mm:ss")}
                  </span>
                </>
              )}
              {entry.maxSpawnTime && (
                <>
                  <span className="ll:text-gray-400">
                    {t("history.details.max")}
                  </span>
                  <span className="ll:text-right ll:text-gray-100">
                    {format(new Date(entry.maxSpawnTime), "dd.MM HH:mm:ss")}
                  </span>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
};
