import type { AccessPolicy } from "@lootlog/domain/access-policy";
import { useState, type FC } from "react";
import {
  Popover,
  preservePopoverOnMenuPress,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContextMenuItem } from "@/components/ui/context-menu";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { canDeleteTimer } from "@/features/timers/model/timer-permissions";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";

type DeleteTimerPopoverProps = {
  timer: TimerWithTimeLeft;
  policiesByGuildId: Record<string, AccessPolicy | undefined>;
  guildNamesById: Record<string, string>;
  onDeleteTimer: (guildId: string, timerKey: string) => void;
};

const DELETE_ITEM_CLASS_NAME =
  "ll:text-red-300 ll:hover:bg-red-500/20 ll:data-[highlighted]:bg-red-500/20 ll:focus-visible:bg-red-500/20";

/**
 * Delete entry for a grouped timer: deletes directly when exactly one of its
 * organizations permits it, otherwise asks which organization to delete from.
 */
export const DeleteTimerPopover: FC<DeleteTimerPopoverProps> = ({
  timer,
  policiesByGuildId,
  guildNamesById,
  onDeleteTimer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const guildEntries = timer.mergedGuildIds ?? [];

  const uniqueGuildIds = [
    ...new Set(guildEntries.map((entry) => entry.guildId)),
  ];

  const permissionsLoading = uniqueGuildIds.some(
    (guildId) => policiesByGuildId[guildId] === undefined,
  );

  const deletableGuilds = uniqueGuildIds.flatMap((guildId) => {
    const timerKey = guildEntries.find(
      (entry) => entry.guildId === guildId,
    )?.timerKey;

    if (!timerKey || !canDeleteTimer(policiesByGuildId[guildId])) return [];

    return [{ guildId, timerKey }];
  });

  if (permissionsLoading) {
    return (
      <ContextMenuItem disabled>
        <Loader2 className="ll:mr-2 ll:size-4 ll:animate-spin ll:motion-reduce:animate-none" />
        {t("contextMenu.loadingPermissions")}
      </ContextMenuItem>
    );
  }

  if (deletableGuilds.length === 0) {
    return null;
  }

  if (deletableGuilds.length === 1) {
    const guild = deletableGuilds[0];

    return (
      <ContextMenuItem
        className={DELETE_ITEM_CLASS_NAME}
        onClick={() => onDeleteTimer(guild.guildId, guild.timerKey)}
      >
        <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
        {t("contextMenu.delete")}
      </ContextMenuItem>
    );
  }

  return (
    <Popover open={open} onOpenChange={preservePopoverOnMenuPress(setOpen)}>
      <PopoverTrigger asChild>
        <ContextMenuItem
          className={DELETE_ITEM_CLASS_NAME}
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.delete")}
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent
        className="ll-action-menu ll:w-64 ll:p-0 ll:overflow-hidden"
        side="right"
        align="start"
        finalFocus={false}
      >
        <div className="ll:flex ll:flex-col ll:gap-0">
          <p className="ll:text-xs ll:font-semibold ll:m-0 ll:px-2 ll:py-2 ll:text-muted-foreground">
            {t("contextMenu.deleteChooseGuild")}
          </p>
          {deletableGuilds.map((guild) => (
            <Button
              size="xs"
              type="button"
              key={guild.guildId}
              variant="menu"
              className="ll:justify-start ll:text-left ll:text-red-300 ll:hover:bg-red-500/20"
              onClick={() => {
                onDeleteTimer(guild.guildId, guild.timerKey);
                setOpen(false);
              }}
            >
              {guildNamesById[guild.guildId] ?? guild.guildId}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
