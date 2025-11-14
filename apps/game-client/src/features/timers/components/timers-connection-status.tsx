import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { Game } from "@/lib/game";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settings.store";
import type { FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGuilds } from "@/hooks/api/use-guilds";

export const TimersConnectionStatus: FC = () => {
  const defaultWorld = Game.getWorldName();
  const { world, allowWorldSelection } = useSettingsStore();
  const desiredWorld = world && allowWorldSelection ? world : defaultWorld;
  const { isListenersActive, joinedGuilds } = useTimersSocket(desiredWorld);
  const { data: guilds } = useGuilds();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "ll:size-3 ll:rounded-full ll:absolute ll:left-6 ll:cursor-pointer",
            {
              "ll:bg-red-400": !isListenersActive,
              "ll:bg-green-400": isListenersActive,
            },
          )}
        />
      </TooltipTrigger>
      <TooltipContent>
        {joinedGuilds && joinedGuilds.length > 0 ? (
          <div className="ll:flex ll:flex-col ll:gap-2">
            <div>Połączono z serwerami:</div>
            <div>
              {joinedGuilds.map((g) => (
                <div key={g}>
                  {guilds?.find((guild) => guild.id === g)?.name || g}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>Nie połączono z żadnym serwerem</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
