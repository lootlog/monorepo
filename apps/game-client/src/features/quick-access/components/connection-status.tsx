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
import {
  CONNECTION_STATUS_TONE,
  CONNECTION_TONE_TEXT_CLASS_NAME,
  SIGNED_OUT_CONNECTION_TONE,
} from "@/components/connection-status-tone";
import { useSocket } from "@/contexts/socket-context";
import { useSignInRequired } from "@/hooks/auth/use-login-state";
import { useWindowsStore } from "@/store/windows.store";
import { ConnectionStatusIcon } from "@/features/quick-access/components/connection-status-icon";
import { useSubmissionFeedback } from "@/features/quick-access/hooks/use-submission-feedback";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { LoaderCircle, LogIn, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

const STATUS_ICON = {
  online: {
    Icon: Wifi,
    className: CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.online],
  },
  connecting: {
    Icon: LoaderCircle,
    className: cn(
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.connecting],
      "ll:animate-spin ll:motion-reduce:animate-none",
    ),
  },
  reconnecting: {
    Icon: WifiOff,
    className:
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.reconnecting],
  },
  unreachable: {
    Icon: WifiOff,
    className:
      CONNECTION_TONE_TEXT_CLASS_NAME[CONNECTION_STATUS_TONE.unreachable],
  },
} as const satisfies Record<
  RealtimeConnectionStatus,
  { Icon: typeof Wifi; className: string }
>;

const SIGNED_OUT_ICON = {
  Icon: LogIn,
  className: CONNECTION_TONE_TEXT_CLASS_NAME[SIGNED_OUT_CONNECTION_TONE],
};

const LATENCY_PROBE_INTERVAL_MS = 2_000;

const isOutage = (status: RealtimeConnectionStatus) =>
  status === "reconnecting" || status === "unreachable";

export const ConnectionStatus: FC = () => {
  const { t } = useTranslation("quickAccess");
  const { t: tCommon } = useTranslation("common");
  const { socket, joinedGuilds, status } = useSocket();
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { visible: feedback, signalCount } = useSubmissionFeedback();

  const [recovery, setRecovery] = useState({ status, count: 0 });

  if (recovery.status !== status) {
    setRecovery({
      status,
      count:
        recovery.count +
        (status === "online" && isOutage(recovery.status) ? 1 : 0),
    });
  }

  const latencyVisible = open || tooltipOpen;

  const [heartbeatLatencyMs, setHeartbeatLatencyMs] = useState<number | null>(
    null,
  );

  useEffect(
    () => socket?.subscribeHeartbeatLatency(setHeartbeatLatencyMs),
    [socket],
  );

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

  const openAndFocus = useWindowsStore((state) => state.openAndFocus);

  const signedOut = useSignInRequired();
  const online = !signedOut && status === "online";

  const statusLabel = signedOut
    ? tCommon("connection.signedOut")
    : tCommon(`connection.${status}`);

  const { Icon, className: iconClassName } = signedOut
    ? SIGNED_OUT_ICON
    : STATUS_ICON[status];

  const pingLabel =
    online && heartbeatLatencyMs !== null
      ? t("connection.heartbeatPing", { ping: heartbeatLatencyMs })
      : null;

  const canReconnect = !signedOut && isOutage(status);

  return (
    <>
      <span role="status" className="ll:sr-only">
        {feedback
          ? t(`connection.submission.${feedback.kind}.${feedback.outcome}`)
          : null}
      </span>
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
            <ConnectionStatusIcon
              Icon={Icon}
              className={iconClassName}
              recoveryCount={signedOut ? 0 : recovery.count}
              signalCount={signalCount}
              feedback={feedback}
            />
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
          {signedOut ? (
            <Button
              size="xs"
              className="ll:w-full"
              onClick={() => {
                setOpen(false);
                openAndFocus("extension-login");
              }}
            >
              <LogIn aria-hidden="true" />
              {tCommon("auth.signIn")}
            </Button>
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
    </>
  );
};
