import { EmptyMedia } from "@lootlog/ui/components/empty";
import { cn } from "cn";
import { CircleAlert } from "lucide-react";
import { RetryButton } from "@/components/common/retry-button";

type QueryErrorNoticeProps = {
  message: string;
  detail?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
};

export const QueryErrorNotice = ({
  message,
  detail,
  onRetry,
  isRetrying = false,
  className,
}: QueryErrorNoticeProps) => {
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
      {onRetry && <RetryButton onRetry={onRetry} isRetrying={isRetrying} />}
    </div>
  );
};
