import { AlertCircle, RotateCcw } from "lucide-react";
import type { FC, ReactNode } from "react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type AsyncContentProps = {
  children: ReactNode;
  error: unknown;
  errorLabel: string;
  isLoading: boolean;
  loadingLabel: string;
  onRetry?: () => void;
  retryLabel: string;
};

export const AsyncContent: FC<AsyncContentProps> = ({
  children,
  error,
  errorLabel,
  isLoading,
  loadingLabel,
  onRetry,
  retryLabel,
}) => {
  const showLoadingFallback = useDelayedVisibility(isLoading);

  if (isLoading) {
    return (
      <div
        aria-busy
        aria-live="polite"
        className="ll:flex ll:h-full ll:min-h-16 ll:w-full ll:items-center ll:justify-center"
        role="status"
      >
        <span className="ll:sr-only">{loadingLabel}</span>
        {showLoadingFallback ? (
          <Spinner className="ll:size-5 ll:text-gray-300" />
        ) : null}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="ll:flex ll:h-full ll:min-h-16 ll:w-full ll:flex-col ll:items-center ll:justify-center ll:gap-2 ll:px-3 ll:text-center ll:text-xs ll:text-red-200"
        role="alert"
      >
        <AlertCircle
          aria-hidden
          className="ll:size-4 ll:shrink-0 ll:text-red-300"
        />
        <span>{errorLabel}</span>
        {onRetry ? (
          <Button
            className="ll:h-6 ll:gap-1.5 ll:px-2"
            onClick={onRetry}
            type="button"
          >
            <RotateCcw aria-hidden className="ll:size-3" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  return children;
};
