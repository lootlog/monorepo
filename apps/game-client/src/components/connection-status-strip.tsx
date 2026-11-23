import { cn } from "cn";
import { LogIn } from "lucide-react";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { AsyncStatusBar } from "@/components/async-status-bar";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";
import { CONNECTION_STATUS_TONE } from "@/components/connection-status-tone";
import { useSocket } from "@/contexts/socket-context";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { useNoticePresence } from "@/hooks/ui/use-notice-presence";
import { useSignInRequired } from "@/hooks/auth/use-login-state";
import type { RealtimeConnectionStatus } from "@/lib/realtime-connection-status";
import { useWindowsStore } from "@/store/windows.store";

type ConnectionStatusStripProps = {
  className?: string;
  error: boolean;
  errorLabel: string;
  hasData: boolean;
  refreshing: boolean;
  refreshingLabel: string;
  onRetry?: () => void;
};

type Notice = {
  kind: "error" | "loading" | "warning";
  label: string;
  action: "retry" | "signIn" | null;
};

const CONNECTION_NOTICE_DELAY_MS = {
  connecting: 1500,
  online: 0,
  reconnecting: 1000,
  unreachable: 1000,
} as const;

const CONNECTION_NOTICE_KIND = {
  neutral: "loading",
  warning: "warning",
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
  if (signedOut)
    return { kind: "warning", label: signedOutLabel, action: "signIn" };

  if (error) return { kind: "error", label: errorLabel, action: "retry" };

  if (connectionDue && connection !== "online") {
    return {
      kind: CONNECTION_NOTICE_KIND[CONNECTION_STATUS_TONE[connection]],
      label: connectionLabel,
      action: null,
    };
  }

  if (refreshingDue) {
    return { kind: "loading", label: refreshingLabel, action: null };
  }

  return null;
};

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
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const signedOut = useSignInRequired();

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
                <LogIn aria-hidden />
              ) : undefined
            }
          />
        </div>
      ) : null}
    </AsyncStatusBar>
  );
};
