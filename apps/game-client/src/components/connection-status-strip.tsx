import { cn } from "cn";
import { LogIn } from "lucide-react";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { AsyncStatusBar } from "@/components/async-status-bar";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { useSocket } from "@/contexts/socket-context";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { useNoticePresence } from "@/hooks/ui/use-notice-presence";
import { authClient, isSessionSignedOut } from "@/lib/auth-client";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { useWindowsStore } from "@/store/windows.store";

type ConnectionStatusStripProps = {
  className?: string;
  /** A refresh of already loaded data failed; shows `errorLabel` with retry. */
  error: boolean;
  errorLabel: string;
  /**
   * Data is on screen and stays current only through the realtime gateway,
   * so its connection state is worth showing.
   */
  hasData: boolean;
  /** Loaded data is being refreshed. */
  refreshing: boolean;
  refreshingLabel: string;
  onRetry?: () => void;
};

type Notice = {
  kind: "error" | "loading" | "warning";
  label: string;
  action: "retry" | "signIn" | null;
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
  signedOut,
  signedOutLabel,
}: {
  connection: RealtimeConnectionStatus;
  connectionDue: boolean;
  connectionLabel: string;
  error: boolean;
  errorLabel: string;
  refreshingDue: boolean;
  refreshingLabel: string;
  signedOut: boolean;
  signedOutLabel: string;
}): Notice | null => {
  // Without a session neither a retry nor the gateway can bring data back.
  if (signedOut)
    return { kind: "warning", label: signedOutLabel, action: "signIn" };

  if (error) return { kind: "error", label: errorLabel, action: "retry" };

  if (connectionDue && connection !== "online") {
    return {
      kind: CONNECTION_NOTICE_KIND[connection],
      label: connectionLabel,
      action: null,
    };
  }

  if (refreshingDue) {
    return { kind: "loading", label: refreshingLabel, action: null };
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
  error,
  errorLabel,
  hasData,
  refreshing,
  refreshingLabel,
  onRetry,
}) => {
  const { t } = useTranslation("common");
  const { status } = useSocket();
  const session = authClient.useSession();
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  // A confirmed missing session, not one that is loading or failed to load.
  const signedOut = isSessionSignedOut(session);

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
    signedOut: hasData && signedOut,
    signedOutLabel: t("connection.signedOut"),
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
            onRetry={
              shownNotice.action === "signIn"
                ? () => openAndFocus("extension-login")
                : shownNotice.action === "retry"
                  ? onRetry
                  : undefined
            }
            retryLabel={
              shownNotice.action === "signIn"
                ? t("auth.signIn")
                : t("actions.retry")
            }
            retryIcon={
              shownNotice.action === "signIn" ? (
                <LogIn aria-hidden className="ll:size-3" />
              ) : undefined
            }
          />
        </div>
      ) : null}
    </AsyncStatusBar>
  );
};
