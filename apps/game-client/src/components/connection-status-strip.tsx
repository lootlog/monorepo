import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { AsyncStatusBar } from "@/components/async-status-bar";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";

type ConnectionStatusStripProps = {
  className?: string;
  /** A refresh of already loaded data failed; shows `errorLabel` with retry. */
  error: boolean;
  errorLabel: string;
  /** Loaded data may be behind the server because the gateway is disconnected. */
  offline: boolean;
  offlineLabel: string;
  /** Loaded data is being refreshed; shown after a short delay. */
  refreshing: boolean;
  refreshingLabel: string;
  onRetry?: () => void;
};

/**
 * One toolbar strip under a window's controls describing the state of data
 * that is already on screen. Error beats offline beats refreshing so the strip
 * shows a single message at a time.
 */
export const ConnectionStatusStrip: FC<ConnectionStatusStripProps> = ({
  className,
  error,
  errorLabel,
  offline,
  offlineLabel,
  refreshing,
  refreshingLabel,
  onRetry,
}) => {
  const { t } = useTranslation("common");

  return (
    <AsyncStatusBar className={className}>
      <AsyncStatusIndicator
        active={error}
        kind="error"
        layout="strip"
        label={errorLabel}
        onRetry={onRetry}
        retryLabel={t("actions.retry")}
      />
      <AsyncStatusIndicator
        active={!error && offline}
        kind="warning"
        layout="strip"
        label={offlineLabel}
      />
      <AsyncStatusIndicator
        active={!error && !offline && refreshing}
        delay
        kind="loading"
        layout="strip"
        label={refreshingLabel}
      />
    </AsyncStatusBar>
  );
};
