import type { FC } from "react";
import { cn } from "cn";
import { AsyncStatusIndicator } from "@/components/async-status-indicator";

type AsyncStatusStackProps = {
  error: boolean;
  errorLabel: string;
  offline?: boolean;
  offlineLabel?: string;
  refreshing: boolean;
  refreshingLabel: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

/**
 * The refresh error / offline / refreshing indicators a live list shows in
 * its top-right corner. Only the most severe state is visible at a time.
 */
export const AsyncStatusStack: FC<AsyncStatusStackProps> = ({
  error,
  errorLabel,
  offline = false,
  offlineLabel,
  refreshing,
  refreshingLabel,
  onRetry,
  retryLabel,
  className,
}) => (
  <div
    className={cn(
      "ll:pointer-events-auto ll:absolute ll:right-1 ll:top-1 ll:z-20 ll:flex ll:max-w-[calc(100%-8px)] ll:items-start ll:gap-1",
      className,
    )}
  >
    <AsyncStatusIndicator
      active={error}
      kind="error"
      label={errorLabel}
      onRetry={onRetry}
      retryLabel={retryLabel}
    />
    {offlineLabel ? (
      <AsyncStatusIndicator
        active={!error && offline}
        kind="warning"
        label={offlineLabel}
      />
    ) : null}
    <AsyncStatusIndicator
      active={!error && !offline && refreshing}
      delay
      kind="loading"
      label={refreshingLabel}
    />
  </div>
);
