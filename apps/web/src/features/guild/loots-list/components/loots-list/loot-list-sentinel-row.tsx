import { Button } from "@lootlog/ui/components/button";
import { Spinner } from "@lootlog/ui/components/spinner";
import { CircleAlert } from "lucide-react";

type Props = {
  hasNextPage: boolean;
  hasError: boolean;
  onRetry: () => void;
  loadingLabel: string;
  endLabel: string;
  errorLabel: string;
  retryLabel: string;
};

/**
 * The final virtual row: a loader while pages remain, a retry row when the
 * last request failed, otherwise the end note. Loaded cards stay above it.
 */
export const LootListSentinelRow = ({
  hasNextPage,
  hasError,
  onRetry,
  loadingLabel,
  endLabel,
  errorLabel,
  retryLabel,
}: Props) => (
  <div
    role={hasError ? "alert" : "status"}
    className="flex h-16 items-center justify-center gap-3 rounded-xl border border-border/50 bg-card/30 text-sm text-muted-foreground"
  >
    {hasError ? (
      <>
        <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
        <span>{errorLabel}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      </>
    ) : hasNextPage ? (
      <>
        <Spinner className="size-5 text-primary" />
        <span className="font-medium">{loadingLabel}</span>
      </>
    ) : (
      <span className="text-xs">{endLabel}</span>
    )}
  </div>
);
