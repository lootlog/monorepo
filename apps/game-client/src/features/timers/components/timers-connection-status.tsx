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
import { useTranslation } from "react-i18next";

export const TimersConnectionStatus: FC = () => {
  const { t } = useTranslation("timers");
  const { connected, joined, joinedGuilds } = useSocket();
  const { data: guilds } = useUsersControllerGetCurrentUserAccessibleGuilds({
    query: {
      queryKey: getUsersControllerGetCurrentUserAccessibleGuildsQueryKey(),
      refetchOnMount: false,
      staleTime: 1000 * 60 * 5,
    },
  });

  const connectedToServers =
    connected && joined && joinedGuilds && joinedGuilds.length > 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "ll:size-3 ll:rounded-full ll:absolute ll:left-6 ll:cursor-pointer",
            {
              "ll:bg-red-400": !connectedToServers,
              "ll:bg-green-400": connectedToServers,
            },
          )}
        />
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
