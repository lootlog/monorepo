import { EmptyState } from "@/components/common/empty-state";
import { LoadingSlot } from "@/components/common/loading-slot";
import { RetryButton } from "@/components/common/retry-button";
import { CircleAlert, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { LootSingleComment } from "./loot-single-comment";
import type { LootCommentsState } from "./use-loot-comments";

/** The comments, or their loading, error or empty state. */
export const LootCommentsFeed = ({
  comments,
  className,
  emptyClassName,
}: {
  comments: LootCommentsState;
  className?: string;
  emptyClassName?: string;
}) => {
  const { t } = useTranslation();

  const { data, isLoading, isError, isFetching, refetch } =
    comments.commentsQuery;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center px-4 py-5",
          emptyClassName,
        )}
      >
        <LoadingSlot size="small" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        compact
        icon={CircleAlert}
        title={t("loots.details.comments.error")}
        className={emptyClassName}
        action={
          <RetryButton onRetry={() => refetch()} isRetrying={isFetching} />
        }
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        compact
        icon={MessageSquare}
        title={t("loots.details.comments.empty")}
        className={emptyClassName}
      />
    );
  }

  return (
    <ul className={cn("m-0 p-0", className)}>
      {data.map((comment) => (
        <LootSingleComment key={comment.id} comment={comment} />
      ))}
    </ul>
  );
};
