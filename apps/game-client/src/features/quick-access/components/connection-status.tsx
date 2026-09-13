import { cn } from "cn";
import type { FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  useUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { useSocket } from "@/contexts/socket-context";
import { summarizeRealtimeConnection } from "@/lib/realtime-connection-summary";
import { useTranslation } from "react-i18next";

export const ConnectionStatus: FC = () => {
  const { t } = useTranslation("quickAccess");
  const { connected, joined, joinedGuilds } = useSocket();

  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const connectedToServers =
    summarizeRealtimeConnection({ connected, joined, joinedGuilds }) ===
    "connected";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t(
            connectedToServers
              ? "connection.connectedToServers"
              : "connection.notConnected",
          )}
          className="ll-custom-cursor-pointer ll:inline-flex ll:size-6 ll:shrink-0 ll:items-center ll:justify-center ll:border-0 ll:bg-transparent ll:p-0 ll:focus-visible:outline ll:focus-visible:outline-2 ll:focus-visible:outline-blue-400"
        >
          <span
            aria-hidden="true"
            className={cn("ll:size-2.5 ll:rounded-full", {
              "ll:bg-red-400": !connectedToServers,
              "ll:bg-green-400": connectedToServers,
            })}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {connectedToServers ? (
          <div className="ll:flex ll:flex-col ll:gap-2">
            <div>{t("connection.connectedToServers")}</div>
            <div>
              {joinedGuilds.map((g) => (
                <div key={g}>
                  {guilds?.find((guild) => guild.id === g)?.name || g}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>{t("connection.notConnected")}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
