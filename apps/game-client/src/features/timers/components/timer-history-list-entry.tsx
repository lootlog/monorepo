import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TimerHistoryResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
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
    iconClassName: "ll:text-emerald-700 ll:in-[.dark-theme]:text-emerald-300",
  },
  RESET: {
    Icon: RotateCcw,
    iconClassName: "ll:text-sky-700 ll:in-[.dark-theme]:text-sky-300",
  },
  DELETE: {
    Icon: Trash2,
    iconClassName: "ll:text-red-700 ll:in-[.dark-theme]:text-red-300",
  },
  RESTORE: {
    Icon: Undo2,
    iconClassName: "ll:text-teal-700 ll:in-[.dark-theme]:text-teal-300",
  },
} satisfies Record<
  TimerHistoryResponseDto["action"],
  {
    Icon: typeof Plus;
    iconClassName: string;
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
          <span
            className={cn(
              "ll:box-border ll:flex ll:w-full ll:items-center ll:rounded-sm ll:bg-muted/50 ll:min-h-7 ll:py-1 ll:px-2 ll:justify-start ll:gap-1.5",
              { "ll:py-1.5": rowLayout === "npcWithMember" },
            )}
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
                  <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:font-semibold ll:text-popover-foreground">
                    {getNpcLabel(entry)}
                  </span>
                  <span className="ll:min-w-0 ll:truncate ll:text-[10px] ll:text-muted-foreground">
                    {getEntryMainLabel(entry)}
                  </span>
                </>
              ) : (
                <span className="ll:min-w-0 ll:truncate ll:text-[11px] ll:font-semibold ll:text-popover-foreground">
                  {getEntryMainLabel(entry)}
                </span>
              )}
            </span>
            {entry.canRestore && (
              <Button
                aria-label={t("history.restore")}
                className="ll:size-6 ll:p-0 ll:shrink-0"
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
                variant="menu"
              >
                <RotateCcw className="ll:h-3 ll:w-3" />
              </Button>
            )}
            <span className="ll:ml-auto ll:shrink-0 ll:text-[10px] ll:text-muted-foreground">
              {format(new Date(entry.createdAt), "HH:mm:ss")}
            </span>
          </span>
        </span>
      </TooltipTrigger>
      {tooltipOpen && (
        <TooltipContent
          side="right"
          className="ll:w-72 ll:max-w-72 ll:overflow-hidden ll:rounded-lg ll:border ll:border-solid ll:border-white/50 ll:bg-popover ll:p-0 ll:text-popover-foreground ll:text-left ll:shadow-md"
        >
          <div className="ll:p-2">
            <div className="ll:flex ll:items-center ll:gap-2">
              <span className="ll:flex ll:h-6 ll:w-6 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:bg-muted">
                <ActionIcon
                  className={cn("ll:h-4 ll:w-4", actionConfig.iconClassName)}
                />
              </span>
              <div className="ll:min-w-0 ll:flex-1">
                <div className="ll:text-[11px] ll:font-semibold ll:uppercase ll:tracking-wide ll:text-popover-foreground">
                  {t(`history.actions.${entry.action.toLowerCase()}`)}
                </div>
                <div className="ll:truncate ll:text-[10px] ll:text-muted-foreground">
                  {format(new Date(entry.createdAt), "dd.MM.yyyy HH:mm:ss")}
                </div>
              </div>
            </div>

            <div className="ll:mt-2 ll:pt-2">
              <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-muted-foreground">
                {t("history.details.npc")}
              </div>
              <div className="ll:truncate ll:text-sm ll:font-semibold ll:text-popover-foreground">
                {getNpcLabel(entry)}
              </div>
            </div>

            <div className="ll:mt-2 ll:grid ll:gap-1 ll:pt-2">
              <div className="ll:min-w-0">
                <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-muted-foreground">
                  {t("history.details.member")}
                </div>
                <div className="ll:truncate ll:text-[11px] ll:font-semibold ll:text-popover-foreground">
                  {getEntryMainLabel(entry)}
                </div>
              </div>
              {entry.actorCharacter && (
                <div className="ll:min-w-0">
                  <div className="ll:text-[10px] ll:uppercase ll:tracking-wide ll:text-muted-foreground">
                    {t("history.details.character")}
                  </div>
                  <div className="ll:truncate ll:text-[11px] ll:text-popover-foreground">
                    {getCharacterLabel(entry.actorCharacter)}
                  </div>
                </div>
              )}
            </div>

            <div className="ll:mt-2 ll:grid ll:grid-cols-2 ll:gap-x-2 ll:gap-y-1 ll:pt-2 ll:text-[10px]">
              <span className="ll:text-muted-foreground">
                {t("history.details.world")}
              </span>
              <span className="ll:truncate ll:text-right ll:text-popover-foreground">
                {entry.world}
              </span>
              {entry.minSpawnTime && (
                <>
                  <span className="ll:text-muted-foreground">
                    {t("history.details.min")}
                  </span>
                  <span className="ll:text-right ll:text-popover-foreground">
                    {format(new Date(entry.minSpawnTime), "dd.MM HH:mm:ss")}
                  </span>
                </>
              )}
              {entry.maxSpawnTime && (
                <>
                  <span className="ll:text-muted-foreground">
                    {t("history.details.max")}
                  </span>
                  <span className="ll:text-right ll:text-popover-foreground">
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
