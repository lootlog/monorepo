import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { cn } from "cn";
import { useEffect, useState, type FC } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSocket } from "@/contexts/socket-context";
import { useTranslation } from "react-i18next";

/** Gateway connection dot for the quick access title bar; lists joined guilds on hover. */
export const ConnectionStatus: FC = () => {
  const { t } = useTranslation("quickAccess");
  const { t: tCommon } = useTranslation("common");
  const { socket, joinedGuilds, status } = useSocket();

  const [heartbeatLatencyMs, setHeartbeatLatencyMs] = useState<number | null>(
    null,
  );

  useEffect(
    () => socket?.subscribeHeartbeatLatency(setHeartbeatLatencyMs),
    [socket],
  );

  const {
    guildsQuery: { data: guilds },
  } = useLootlogGuilds();

  const online = status === "online";
  const statusLabel = tCommon(`connection.${status}`);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-ll-draggable="false"
          aria-label={[
            statusLabel,
            online && heartbeatLatencyMs !== null
              ? t("connection.heartbeatPing", { ping: heartbeatLatencyMs })
              : null,
          ]
            .filter(Boolean)
            .join(" ")}
          className="ll-custom-cursor-pointer ll:inline-flex ll:h-5 ll:min-w-5 ll:gap-1 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:p-0 ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        >
          <span
            aria-hidden="true"
            className={cn(
              "ll:size-2 ll:rounded-full ll:transition-colors ll:duration-300 ll:motion-reduce:transition-none",
              {
                "ll:bg-green-400 ll:shadow-[0_0_5px_rgba(74,222,128,0.7)]":
                  online,
                "ll:bg-yellow-400 ll:shadow-[0_0_5px_rgba(250,204,21,0.6)]":
                  status === "connecting",
                "ll:bg-red-400 ll:shadow-[0_0_5px_rgba(248,113,113,0.7)]":
                  status === "reconnecting" || status === "unreachable",
              },
            )}
          />
          {online && heartbeatLatencyMs !== null && (
            <span className="ll:text-[10px] ll:tabular-nums" aria-hidden="true">
              {t("connection.ping", { ping: heartbeatLatencyMs })}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {online && joinedGuilds.length > 0 ? (
          <div className="ll:flex ll:flex-col ll:gap-1">
            <div className="ll:font-semibold">{statusLabel}</div>
            <div className="ll:flex ll:flex-col ll:gap-0.5 ll:text-muted-foreground">
              {joinedGuilds.map((g) => (
                <div key={g}>
                  {guilds?.find((guild) => guild.id === g)?.name || g}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>{statusLabel}</div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
