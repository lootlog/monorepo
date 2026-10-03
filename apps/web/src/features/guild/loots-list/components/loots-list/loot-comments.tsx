import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { Button } from "@lootlog/ui/components/button";
import { useState, type FC } from "react";
import { Textarea } from "@lootlog/ui/components/textarea";
import { LootSingleComment } from "@/features/guild/loots-list/components/loots-list/loot-single-comment";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerGetCommentsQueryKey,
  invalidateLootsControllerGetComments,
  useLootsControllerCreateComment,
  useLootsControllerGetComments,
} from "@lootlog/client/main";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSlot } from "@/components/common/loading-slot";
import { CircleAlert, MessageSquare, RotateCcw } from "lucide-react";

const MAX_LENGTH = 256;

type LootCommentProps = {
  lootId: number;
};

export const LootComments: FC<LootCommentProps> = ({ lootId }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  const {
    data: comments,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useLootsControllerGetComments(
    { guildId: guildId ?? "", lootId },
    {
      query: {
        enabled: !!guildId && !!lootId,
        queryKey: getLootsControllerGetCommentsQueryKey({
          guildId: guildId ?? "",
          lootId,
        }),
      },
    },
  );

  const { mutate: createComment, isPending } = useLootsControllerCreateComment({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateLootsControllerGetComments(queryClient, {
          guildId,
          lootId,
        });
        setValue("");
      },
    },
  });

  const normalizedValue = value.trim();

  const isSubmitDisabled =
    normalizedValue.length === 0 || value.length > MAX_LENGTH || isPending;

  const handleAddComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitDisabled || !guildId) {
      return;
    }

    createComment({
      pathParams: { guildId, lootId },
      data: { content: normalizedValue },
    });
  };

  return (
    <section className="flex flex-col">
      <SectionCardHeader
        title={t("loots.details.comments.title", {
          count: comments?.length ?? 0,
        })}
      />

      <div className="border-b border-border bg-card/20 px-3 py-3 sm:px-4">
        <form className="space-y-2" onSubmit={handleAddComment}>
          <Textarea
            className="min-h-20 w-full resize-y rounded-xl border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/60"
            placeholder={t("loots.details.comments.placeholder")}
            autoFocus={false}
            maxLength={MAX_LENGTH}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {value.length}/{MAX_LENGTH}
            </span>
            <Button
              className="h-8 px-3 text-xs"
              size="sm"
              type="submit"
              disabled={isSubmitDisabled}
              loading={isPending}
            >
              {t("loots.details.comments.submit")}
            </Button>
          </div>
        </form>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center px-4 py-5">
          <LoadingSlot size="small" />
        </div>
      )}
      {isError && (
        <EmptyState
          compact
          icon={CircleAlert}
          title={t("loots.details.comments.error")}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={isFetching}
              icon=<RotateCcw className="size-3.5" />
              onClick={() => void refetch()}
            >
              {t("common.actions.retry")}
            </Button>
          }
        />
      )}
      {!isLoading && !isError && comments?.length === 0 && (
        <EmptyState
          compact
          icon={MessageSquare}
          title={t("loots.details.comments.empty")}
        />
      )}
      {!isLoading && !isError && comments && comments.length > 0 && (
        <ul className="m-0 p-0">
          {comments.map((comment) => (
            <LootSingleComment key={comment.id} comment={comment} />
          ))}
        </ul>
      )}
    </section>
  );
};
