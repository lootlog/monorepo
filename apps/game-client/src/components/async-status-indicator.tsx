import { AlertCircle, Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { FC } from "react";
import { cn } from "cn";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { IconButton } from "@/components/ui/icon-button";

type AsyncStatusIndicatorProps = {
  active: boolean;
  delay?: boolean;
  kind: "error" | "loading" | "warning";
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  /**
   * `strip` renders a full-width toolbar strip that stacks with the other
   * strips (rules only on top and bottom); `inline` renders a pill sized to
   * its label.
   */
  layout?: "inline" | "strip";
};

export const AsyncStatusIndicator: FC<AsyncStatusIndicatorProps> = ({
  active,
  delay = false,
  kind,
  label,
  onRetry,
  retryLabel,
  className,
  layout = "inline",
}) => {
  const delayedVisible = useDelayedVisibility(active && delay);
  const visible = active && (!delay || delayedVisible);

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className={cn(
        "ll:min-h-5 ll:items-center ll:gap-1.5 ll:rounded-sm ll:border ll:px-2 ll:py-0.5 ll:text-[10px] ll:leading-none ll:shadow-sm",
        layout === "strip"
          ? "ll:-mt-px ll:flex ll:h-7 ll:w-full ll:rounded-none ll:border-x-0 ll:shadow-none"
          : "ll:inline-flex",
        kind === "error"
          ? "ll:border-red-500/50 ll:bg-red-950/85 ll:text-red-200"
          : kind === "warning"
            ? "ll:border-amber-500/50 ll:bg-amber-950/85 ll:text-amber-100"
            : "ll:border-gray-600 ll:bg-gray-900/85 ll:text-gray-200",
        className,
      )}
      role="status"
    >
      {kind === "loading" ? (
        <Loader2
          aria-hidden
          className="ll:size-3 ll:animate-spin ll:motion-reduce:animate-none"
        />
      ) : kind === "warning" ? (
        <WifiOff aria-hidden className="ll:size-3" />
      ) : (
        <AlertCircle aria-hidden className="ll:size-3" />
      )}
      <span className="ll:min-w-0 ll:flex-1">{label}</span>
      {onRetry && retryLabel ? (
        // Pulled into the padding so the 24px target keeps the pill's height.
        <IconButton
          label={retryLabel}
          className="ll:-my-1.5 ll:-mr-1.5"
          onClick={onRetry}
        >
          <RotateCcw aria-hidden className="ll:size-3" />
        </IconButton>
      ) : null}
    </div>
  );
};
