import { useState, type FC } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContextMenuItem } from "@/components/ui/context-menu";
import {
  getGuildsControllerGetGuildPermissionsQueryKey,
  guildsControllerGetGuildPermissions,
} from "@lootlog/api-client/react-query/main/guilds";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/api-client/react-query/main/users";
import type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";
import { REQUIRED_DELETE_PERMISSIONS } from "@/features/timers/constants/required-delete-permissions";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Loader2, Trash2 } from "lucide-react";

type DeleteTimerPopoverProps = {
  timer: TimerWithTimeLeft;
  onDeleteTimer: (guildId: string, timerKey: string) => void;
};

export const DeleteTimerPopover: FC<DeleteTimerPopoverProps> = ({
  timer,
  onDeleteTimer,
}) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const guildEntries = timer.mergedGuildIds ?? [];
  const uniqueGuildIds = Array.from(
    new Set(guildEntries.map((entry) => entry.guildId)),
  );

  const permissionsQueries = useQueries({
    queries: uniqueGuildIds.map((guildId) => ({
      queryKey: getGuildsControllerGetGuildPermissionsQueryKey({ guildId }),
      queryFn: () => guildsControllerGetGuildPermissions({ guildId }),
      staleTime: 5 * 60 * 1000,
    })),
  });
  const permissionsLoading = permissionsQueries.some(
    (query) => query.isPending,
  );

  const guildsWithPermissions = uniqueGuildIds
    .map((guildId, index) => {
      const permissions = permissionsQueries[index]?.data ?? [];
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

  if (permissionsLoading) {
    return (
      <ContextMenuItem disabled>
        <Loader2 className="ll:mr-2 ll:size-4 ll:animate-spin ll:motion-reduce:animate-none" />
        {t("contextMenu.loadingPermissions")}
      </ContextMenuItem>
    );
  }

  if (guildsWithPermissions.length === 0) {
    return null;
  }

  if (guildsWithPermissions.length === 1) {
    const guild = guildsWithPermissions[0];
    return (
      <ContextMenuItem
        onClick={() => onDeleteTimer(guild.guildId, guild.timerKey)}
      >
        <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
        {t("contextMenu.delete")}
      </ContextMenuItem>
    );
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen, eventDetails) => {
        if (
          !nextOpen &&
          eventDetails.reason === "outside-press" &&
          eventDetails.event.target instanceof Element &&
          eventDetails.event.target.closest('[role="menu"]')
        ) {
          eventDetails.cancel();
          return;
        }

        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <ContextMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Trash2 className="ll:h-4 ll:w-4 ll:mr-2" />
          {t("contextMenu.delete")}
        </ContextMenuItem>
      </PopoverTrigger>
      <PopoverContent
        className="ll:w-64 ll:p-2"
        side="right"
        align="start"
        initialFocus={false}
        finalFocus={false}
      >
        <div className="ll:flex ll:flex-col ll:gap-1">
          <p className="ll:text-xs ll:font-semibold ll:mb-1 ll:text-gray-400">
            {t("contextMenu.deleteChooseGuild")}
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
