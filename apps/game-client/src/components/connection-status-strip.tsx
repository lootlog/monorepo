import { cn } from "cn";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { AsyncStatusBar } from "@/components/async-status-bar";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useSocket } from "@/contexts/socket-context";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { useNoticePresence } from "@/hooks/ui/use-notice-presence";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";

type ConnectionStatusStripProps = {
  className?: string;
  /**
   * A refresh of already loaded data failed; shows `errorLabel` with retry.
   * Windows whose data arrives only over the realtime gateway omit it.
   */
  error?: boolean;
  errorLabel?: string;
  /**
   * Data is on screen and stays current only through the realtime gateway,
   * so its connection state is worth showing.
   */
  hasData: boolean;
  /** Loaded data is being refreshed. */
  refreshing?: boolean;
  refreshingLabel?: string;
  onRetry?: () => void;
};

type Notice = {
  kind: "error" | "loading" | "warning";
  label: string;
  retry: boolean;
};

/**
 * How long each condition must last before the strip shows it. A page load
 * connects while cached data is already on screen, and a dropped connection
 * often recovers within a second; neither is worth a strip.
 */
const CONNECTION_NOTICE_DELAY_MS = {
  connecting: 1500,
  online: 0,
  reconnecting: 1000,
  unreachable: 1000,
} as const;

const CONNECTION_NOTICE_KIND = {
  connecting: "loading",
  reconnecting: "warning",
  unreachable: "warning",
} as const;

const REFRESHING_NOTICE_DELAY_MS = 200;

const resolveNotice = ({
  connection,
  connectionDue,
  connectionLabel,
  error,
  errorLabel,
  refreshingDue,
  refreshingLabel,
}: {
  connection: RealtimeConnectionStatus;
  connectionDue: boolean;
  connectionLabel: string;
  error: boolean;
  errorLabel: string;
  refreshingDue: boolean;
  refreshingLabel: string;
}): Notice | null => {
  if (error) return { kind: "error", label: errorLabel, retry: true };

  if (connectionDue && connection !== "online") {
    return {
      kind: CONNECTION_NOTICE_KIND[connection],
      label: connectionLabel,
      retry: false,
    };
  }

  if (refreshingDue) {
    return { kind: "loading", label: refreshingLabel, retry: false };
  }

  return null;
};

/**
 * One toolbar strip under a window's controls describing the state of data
 * that is already on screen. Error beats the realtime connection beats
 * refreshing, so the strip shows a single message at a time. It unfolds and
 * folds away instead of jumping, and a condition that clears quickly never
 * shows at all.
 */
export const ConnectionStatusStrip: FC<ConnectionStatusStripProps> = ({
  className,
  error = false,
  errorLabel = "",
  hasData,
  refreshing = false,
  refreshingLabel = "",
  onRetry,
}) => {
  const { t } = useTranslation("common");
  const { status } = useSocket();

  // Each condition waits out its own delay, so one that takes over from a
  // notice already on screen cannot skip it.
  const connectionDue = useDelayedVisibility(
    hasData && status !== "online",
    CONNECTION_NOTICE_DELAY_MS[status],
  );

  const refreshingDue = useDelayedVisibility(
    refreshing,
    REFRESHING_NOTICE_DELAY_MS,
  );

  const notice = resolveNotice({
    connection: status,
    connectionDue,
    connectionLabel: t(`connection.${status}`),
    error,
    errorLabel,
    refreshingDue,
    refreshingLabel,
  });

  // The strip keeps showing the last notice while it folds away.
  const [lastNotice, setLastNotice] = useState(notice);

  if (
    notice &&
    (notice.kind !== lastNotice?.kind || notice.label !== lastNotice.label)
  ) {
    setLastNotice(notice);
  }

  const { mounted, leaving } = useNoticePresence(notice !== null);

  const shownNotice = notice ?? lastNotice;

  return (
    <AsyncStatusBar className={className}>
      {mounted && shownNotice ? (
        <div
          className={cn(
            "ll:-mt-px ll:h-7 ll:shrink-0 ll:overflow-hidden",
            leaving ? "ll-status-strip-exit" : "ll-status-strip-enter",
          )}
        >
          <AsyncStatusIndicator
            active
            className="ll:mt-0"
            kind={shownNotice.kind}
            label={shownNotice.label}
            layout="strip"
            onRetry={shownNotice.retry ? onRetry : undefined}
            retryLabel={t("actions.retry")}
          />
        </div>
      ) : null}
    </AsyncStatusBar>
  );
};
