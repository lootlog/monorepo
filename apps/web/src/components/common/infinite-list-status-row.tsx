import { Spinner } from "@lootlog/ui/components/spinner";
import { CircleAlert } from "lucide-react";
import { RetryButton } from "@/components/common/retry-button";

type Props = {
  hasNextPage: boolean;
  hasError: boolean;
  onRetry: () => void;
  loadingLabel: string;
  endLabel: string;
  errorLabel: string;
};

/**
 * The last row of an infinite list: a loader while pages remain, a retry row
 * when the next page failed, otherwise the end note. Loaded items stay above.
 * It sits edge to edge under the list, so it carries no surface of its own.
 */
export const InfiniteListStatusRow = ({
  hasNextPage,
  hasError,
  onRetry,
  loadingLabel,
  endLabel,
  errorLabel,
}: Props) => (
  <div
    role={hasError ? "alert" : "status"}
    className="flex h-16 items-center justify-center gap-3 px-4 text-sm text-muted-foreground"
  >
    {hasError ? (
      <>
        <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
        <span>{errorLabel}</span>
        <RetryButton onRetry={onRetry} />
      </>
    ) : hasNextPage ? (
      <>
        <Spinner className="size-5 text-primary" />
        <span className="font-medium">{loadingLabel}</span>
      </>
    ) : (
      <>
        <span
          aria-hidden="true"
          className="h-px max-w-24 flex-1 bg-sidebar-border"
        />
        <span className="text-xs">{endLabel}</span>
        <span
          aria-hidden="true"
          className="h-px max-w-24 flex-1 bg-sidebar-border"
        />
      </>
    )}
  </div>
);
