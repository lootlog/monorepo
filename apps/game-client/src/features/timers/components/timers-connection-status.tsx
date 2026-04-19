import { cn } from "@/lib/utils";
import type { FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useSocket } from "@/contexts/socket-context";
import { useTranslation } from "react-i18next";

export const TimersConnectionStatus: FC = () => {
  const { t } = useTranslation();
  const { connected, joined, joinedGuilds } = useSocket();
  const { data: guilds } = useGuilds();

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
            <div>{t("settings.timers.connectionStatus.connected")}</div>
            <div>
              {joinedGuilds.map((g) => (
                <div key={g}>
                  {guilds?.find((guild) => guild.id === g)?.name || g}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>{t("settings.timers.connectionStatus.disconnected")}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
