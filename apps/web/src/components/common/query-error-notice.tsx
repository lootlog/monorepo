import { Button } from "@lootlog/ui/components/button";
import { EmptyMedia } from "@lootlog/ui/components/empty";
import { cn } from "cn";
import { CircleAlert, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

type QueryErrorNoticeProps = {
  message: string;
  /** Second line, for example that the content below is the last good copy. */
  detail?: string;
  onRetry: () => void;
  isRetrying?: boolean;
  className?: string;
};

/**
 * One-line failure notice for a section that still has room for other content,
 * such as stale data or the rest of a page. A failure that leaves nothing to
 * show uses `EmptyState` with the same icon instead.
 */
export const QueryErrorNotice = ({
  message,
  detail,
  onRetry,
  isRetrying = false,
  className,
}: QueryErrorNoticeProps) => {
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-center gap-3 p-3 text-sm",
        className,
      )}
    >
      <EmptyMedia variant="icon" className="mb-0 size-8 rounded-lg">
        <CircleAlert className="size-4" aria-hidden="true" />
      </EmptyMedia>
      <div className="min-w-0 text-left">
        <p className="font-medium text-foreground">{message}</p>
        {detail ? (
          <p className="text-xs text-muted-foreground">{detail}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={isRetrying}
        icon=<RotateCcw className="size-3.5" />
        onClick={onRetry}
      >
        {t("common.actions.retry")}
      </Button>
    </div>
  );
};
