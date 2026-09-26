import { useLootlogGuilds } from "@/hooks/use-lootlog-guilds";
import { cn } from "cn";
import { useEffect, useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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

/** Refresh rate of the latency while the player is looking at it. */
const LATENCY_PROBE_INTERVAL_MS = 2_000;

/**
 * Gateway connection state for the quick access title bar. The tooltip names
 * the state and latency; the popover also lists the joined organizations and,
 * while the connection is down, lets the player retry now instead of waiting
 * for the next backoff.
 */
export const ConnectionStatus: FC = () => {
  const { t } = useTranslation("quickAccess");
  const { t: tCommon } = useTranslation("common");
  const { socket, joinedGuilds, status } = useSocket();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const latencyVisible = open || tooltipOpen;

  const [heartbeatLatencyMs, setHeartbeatLatencyMs] = useState<number | null>(
    null,
  );

  useEffect(
    () => socket?.subscribeHeartbeatLatency(setHeartbeatLatencyMs),
    [socket],
  );

  // Heartbeats refresh the latency every 25 seconds; probe faster only while
  // the tooltip or popover shows it.
  useEffect(() => {
    if (!socket || !latencyVisible) return;
    socket.probeLatency();

    const interval = setInterval(
      () => socket.probeLatency(),
      LATENCY_PROBE_INTERVAL_MS,
    );

    return () => clearInterval(interval);
  }, [socket, latencyVisible]);

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
        <IconButton
          label={[statusLabel, pingLabel].filter(Boolean).join(" ")}
          onTooltipOpenChange={setTooltipOpen}
          tooltip={
            <div className="ll:flex ll:flex-col">
              <span>{statusLabel}</span>
              {pingLabel ? (
                <span className="ll:text-muted-foreground ll:tabular-nums">
                  {pingLabel}
                </span>
              ) : null}
            </div>
          }
        >
          <Icon aria-hidden="true" className={iconClassName} />
        </IconButton>
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
