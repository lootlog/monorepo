import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { LIST_TILE_INSET_CLASS } from "@/components/common/list-tile";
import { cn } from "cn";
import { ChevronDown, MessageSquare } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { LootCommentForm } from "./loot-comment-form";
import { LootCommentsFeed } from "./loot-comments-feed";
import { useLootComments } from "./use-loot-comments";

/**
 * Comments under the loot, collapsed: few loots get any, so the items keep
 * the room. They load when the section opens.
 */
export const LootCommentsSection = ({
  lootId,
  commentsCount,
}: {
  lootId: number;
  /** The count the loot carries, shown until the comments load. */
  commentsCount: number;
}) => {
  const { t } = useTranslation();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const comments = useLootComments(lootId, open);
  const count = comments.commentsQuery.data?.length ?? commentsCount;

  return (
    <section aria-labelledby={titleId} className="border-t border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex min-h-11 w-full items-center gap-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                LIST_TILE_INSET_CLASS,
              )}
            />
          }
        >
          <MessageSquare aria-hidden="true" className="size-4 shrink-0" />
          <h2 id={titleId} className="font-medium">
            {t("loots.details.comments.title", { count })}
          </h2>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "ml-auto size-4 shrink-0 transition-[rotate] duration-200 ease-emphasized motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <LootCommentsFeed comments={comments} />
          <div className={cn("bg-card/20 py-3", LIST_TILE_INSET_CLASS)}>
            <LootCommentForm comments={comments} textareaClassName="min-h-16" />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
};
