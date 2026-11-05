import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { cn } from "cn";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { LootCommentForm } from "./loot-comment-form";
import { LootCommentsFeed } from "./loot-comments-feed";
import { useLootComments } from "./use-loot-comments";

/**
 * Comments as a conversation beside the loot: the newest sits right above the
 * form pinned to the bottom, and the list opens scrolled to it.
 */
export const LootCommentsPanel = ({
  lootId,
  className,
}: {
  lootId: number;
  className?: string;
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const comments = useLootComments(lootId);

  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex min-h-0 flex-col", className)}
    >
      <SectionCardHeader
        id={titleId}
        title={t("loots.details.comments.title", {
          count: comments.commentsQuery.data?.length ?? 0,
        })}
      />
      {/* Reversed flow starts scrolled to the end, where the newest comment is. */}
      <div className="flex min-h-40 flex-1 flex-col-reverse overflow-y-auto">
        <LootCommentsFeed
          comments={comments}
          className="flex flex-col-reverse"
          emptyClassName="flex-1 justify-center"
        />
      </div>
      <div className="shrink-0 border-t border-border bg-card/20 px-3 py-3 sm:px-4">
        <LootCommentForm comments={comments} textareaClassName="min-h-16" />
      </div>
    </section>
  );
};
