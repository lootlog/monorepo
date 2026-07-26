import { AlertCircle, Loader2, RotateCcw, WifiOff } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/lib/utils";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { Button } from "@/components/ui/button";

type AsyncStatusIndicatorProps = {
  active: boolean;
  delay?: boolean;
  kind: "error" | "loading" | "warning";
  label: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export const AsyncStatusIndicator: FC<AsyncStatusIndicatorProps> = ({
  active,
  delay = false,
  kind,
  label,
  onRetry,
  retryLabel,
  className,
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
        "ll:inline-flex ll:min-h-5 ll:items-center ll:gap-1.5 ll:rounded-sm ll:border ll:px-2 ll:py-0.5 ll:text-[10px] ll:leading-none ll:shadow-sm",
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
      <span>{label}</span>
      {onRetry && retryLabel ? (
        <Button
          aria-label={retryLabel}
          className="ll:size-4 ll:h-4 ll:border-0 ll:bg-transparent! ll:p-0"
          onClick={onRetry}
          title={retryLabel}
          type="button"
          variant="ghost"
        >
          <RotateCcw aria-hidden className="ll:size-3" />
        </Button>
      ) : null}
    </div>
  );
};
