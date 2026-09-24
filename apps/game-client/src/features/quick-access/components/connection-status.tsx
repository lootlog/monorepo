import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { cn } from "cn";
import { useEffect, useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSocket } from "@/contexts/socket-context";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { LoaderCircle, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shape and color both change per state, so the status never rests on color alone. */
const STATUS_ICON = {
  online: { Icon: Wifi, className: "ll:text-green-400" },
  connecting: {
    Icon: LoaderCircle,
    className:
      "ll:text-yellow-400 ll:animate-spin ll:motion-reduce:animate-none",
  },
  reconnecting: { Icon: WifiOff, className: "ll:text-red-400" },
  unreachable: { Icon: WifiOff, className: "ll:text-red-400" },
} as const satisfies Record<
  RealtimeConnectionStatus,
  { Icon: typeof Wifi; className: string }
>;

/**
 * Gateway connection state for the quick access title bar. The popover names
 * the state, lists the joined organizations and, while the connection is
 * down, lets the player retry now instead of waiting for the next backoff.
 */
export const ConnectionStatus: FC = () => {
  const { t } = useTranslation("quickAccess");
  const { t: tCommon } = useTranslation("common");
  const { socket, joinedGuilds, status } = useSocket();
  const [open, setOpen] = useState(false);

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
  const { Icon, className: iconClassName } = STATUS_ICON[status];

  const pingLabel =
    online && heartbeatLatencyMs !== null
      ? t("connection.heartbeatPing", { ping: heartbeatLatencyMs })
      : null;

  const canReconnect = status === "reconnecting" || status === "unreachable";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ll-draggable="false"
          aria-label={[statusLabel, pingLabel].filter(Boolean).join(" ")}
          className={cn(
            "ll-custom-cursor-pointer ll:inline-flex ll:h-5 ll:min-w-5 ll:gap-1 ll:shrink-0 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-0.5 ll:transition-colors ll:motion-reduce:transition-none ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:outline-ring",
            open && "ll:bg-white/15",
          )}
        >
          <Icon
            size={12}
            aria-hidden="true"
            className={cn("ll:shrink-0", iconClassName)}
          />
          {pingLabel ? (
            <span className="ll:text-[10px] ll:tabular-nums" aria-hidden="true">
              {t("connection.ping", { ping: heartbeatLatencyMs })}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="ll:flex ll:w-56 ll:flex-col ll:gap-2 ll:text-xs"
        align="end"
        side="bottom"
      >
        <div className="ll:flex ll:items-center ll:gap-2 ll:font-semibold">
          <Icon
            size={14}
            aria-hidden="true"
            className={cn("ll:shrink-0", iconClassName)}
          />
          <span>{statusLabel}</span>
        </div>
        {pingLabel ? (
          <div className="ll:text-muted-foreground">{pingLabel}</div>
        ) : null}
        {online && joinedGuilds.length > 0 ? (
          <div className="ll:flex ll:flex-col ll:gap-0.5">
            <div className="ll:text-muted-foreground">
              {t("connection.organizations")}
            </div>
            <ul className="ll:m-0 ll:flex ll:list-none ll:flex-col ll:gap-0.5 ll:p-0">
              {joinedGuilds.map((guildId) => (
                <li key={guildId} className="ll:truncate">
                  {guilds?.find((guild) => guild.id === guildId)?.name ||
                    guildId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {canReconnect ? (
          <Button
            size="xs"
            variant="secondary"
            className="ll:w-full"
            onClick={() => socket?.connect()}
          >
            {t("connection.reconnect")}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
