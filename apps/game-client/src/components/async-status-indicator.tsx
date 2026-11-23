import { AlertCircle, Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/notice";

type AsyncStatusIndicatorProps = {
  active: boolean;
  delay?: boolean;
  kind: "error" | "loading" | "warning";
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryIcon?: ReactNode;
  className?: string;
  layout?: "inline" | "strip";
};

const ASYNC_STATUS_TONE = {
  error: "destructive",
  loading: "neutral",
  warning: "warning",
} as const;

export const AsyncStatusIndicator: FC<AsyncStatusIndicatorProps> = ({
  active,
  delay = false,
  kind,
  label,
  onRetry,
  retryLabel,
  retryIcon,
  className,
  layout = "inline",
}) => {
  const delayedVisible = useDelayedVisibility(active && delay);
  const visible = active && (!delay || delayedVisible);

  if (!visible) {
    return null;
  }

  return (
    <Notice
      aria-live="polite"
      className={className}
      icon={
        kind === "loading" ? (
          <Loader2 className="ll:animate-spin ll:motion-reduce:animate-none" />
        ) : kind === "warning" ? (
          <WifiOff />
        ) : (
          <AlertCircle />
        )
      }
      layout={layout}
      role="status"
      tone={ASYNC_STATUS_TONE[kind]}
    >
      <span className="ll:min-w-0 ll:flex-1 ll:truncate">{label}</span>
      {onRetry && retryLabel ? (
        <IconButton
          label={retryLabel}
          className="ll:-my-1.5 ll:-mr-1.5"
          onClick={onRetry}
        >
          {retryIcon ?? <RotateCcw aria-hidden />}
        </IconButton>
      ) : null}
    </Notice>
  );
};
