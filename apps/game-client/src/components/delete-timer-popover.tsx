import { useState, useMemo, type FC } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { fetchGuildPermissions } from "@/api";
import { useGuilds } from "@/hooks/api/use-guilds";
import {
  getGuildPermissionsQueryKey,
  normalizeGuildPermissions,
} from "@/hooks/api/use-guild-permissions";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { cn } from "@/lib/utils";
import { Permission } from "@lootlog/types";

type DeleteTimerPopoverProps = {
  timer: TimerWithTimeLeft;
  onDeleteTimer: (guildId: string, timerKey: string) => void;
};

const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
];

export const DeleteTimerPopover: FC<DeleteTimerPopoverProps> = ({
  timer,
  onDeleteTimer,
}) => {
  const [open, setOpen] = useState(false);
  const { data: guilds } = useGuilds();

  const guildEntries = useMemo(
    () => timer.mergedGuildIds ?? [],
    [timer.mergedGuildIds],
  );

  const uniqueGuildIds = useMemo(
    () => Array.from(new Set(guildEntries.map((entry) => entry.guildId))),
    [guildEntries],
  );

  const permissionsQueries = useQueries({
    queries: uniqueGuildIds.map((guildId) => ({
      queryKey: getGuildPermissionsQueryKey(guildId),
      queryFn: () => fetchGuildPermissions(guildId),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const guildsWithPermissions = useMemo(() => {
    return uniqueGuildIds
      .map((guildId, index) => {
        const permissions = normalizeGuildPermissions(
          permissionsQueries[index]?.data,
        );
        const canDelete = REQUIRED_DELETE_PERMISSIONS.some((perm) =>
          permissions.includes(perm),
        );
        const entry = guildEntries.find((e) => e.guildId === guildId);
        return {
          guildId,
          timerKey: entry?.timerKey ?? "",
          permissions,
          canDelete,
        };
      })
      .filter((g) => g.canDelete && g.timerKey !== "");
  }, [uniqueGuildIds, permissionsQueries, guildEntries]);

  if (guildsWithPermissions.length === 0) {
    return null;
  }

  if (guildsWithPermissions.length === 1) {
    const guild = guildsWithPermissions[0];
    return (
      <ContextMenuItem
        onClick={() => onDeleteTimer(guild.guildId, guild.timerKey)}
      >
        Usuń timer
      </ContextMenuItem>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          Usuń timer
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent
        className="ll:w-64 ll:p-2"
        side="right"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest('[role="menu"]')
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="ll:flex ll:flex-col ll:gap-1">
          <p className="ll:text-xs ll:font-semibold ll:mb-1 ll:text-gray-400">
            Wybierz serwer do usunięcia timera:
          </p>
          {guildsWithPermissions.map((guild) => {
            const guildData = guilds?.find((g) => g.id === guild.guildId);
            return (
              <button
                type="button"
                key={guild.guildId}
                className={cn(
                  "ll:text-left ll:px-2 ll:py-1.5 ll:rounded ll:text-sm",
                  "ll:bg-gray-700/50 ll:hover:bg-gray-600/50",
                  "ll:transition-colors ll-custom-cursor-pointer",
                  "ll:text-white",
                )}
                onClick={() => {
                  onDeleteTimer(guild.guildId, guild.timerKey);
                  setOpen(false);
                }}
              >
                {guildData?.name ?? guild.guildId}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
