import { useState, useMemo, type FC } from "react";
import { useQueries } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ContextMenuItem } from "@/components/ui/context-menu";
import { useGuilds } from "@/hooks/api/use-guilds";
import { Permission } from "@/hooks/api/use-guild-permissions";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Timer } from "@/hooks/api/use-timers";
import { cn } from "@/lib/utils";

type DeleteTimerPopoverProps = {
  timer: Timer;
  onDeleteTimer: (guildId: string) => void;
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
  const { client } = useAuthenticatedApiClient();

  const uniqueGuildIds = useMemo(
    () =>
      Array.from(
        new Set(
          (timer.members || []).map((member) => member.guildId).filter(Boolean),
        ),
      ),
    [timer.members],
  );

  const permissionsQueries = useQueries({
    queries: uniqueGuildIds.map((guildId) => ({
      queryKey: ["guild-permissions", guildId],
      queryFn: () => client.get<Permission[]>(`/guilds/${guildId}/permissions`),
      staleTime: 5 * 60 * 1000,
      select: (response: { data: Permission[] }) => response.data,
    })),
  });

  const guildsWithPermissions = useMemo(() => {
    return uniqueGuildIds
      .map((guildId, index) => {
        const permissions = permissionsQueries[index]?.data;
        const canDelete = REQUIRED_DELETE_PERMISSIONS.some((perm) =>
          permissions?.includes(perm),
        );
        return {
          guildId,
          permissions,
          canDelete,
        };
      })
      .filter((g) => g.canDelete);
  }, [uniqueGuildIds, permissionsQueries]);

  if (guildsWithPermissions.length === 0) {
    return null;
  }

  if (guildsWithPermissions.length === 1) {
    return (
      <ContextMenuItem
        onClick={() => onDeleteTimer(guildsWithPermissions[0].guildId)}
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
      <PopoverContent className="ll:w-64 ll:p-2" side="right" align="start">
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
                  onDeleteTimer(guild.guildId);
                  setOpen(false);
                }}
              >
                {guildData?.name || guild.guildId}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
