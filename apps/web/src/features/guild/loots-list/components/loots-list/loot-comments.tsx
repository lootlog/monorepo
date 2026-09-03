import { Button } from "@lootlog/ui/components/button";
import { useState, type FC } from "react";
import { Textarea } from "@lootlog/ui/components/textarea";
import { LootSingleComment } from "@/features/guild/loots-list/components/loots-list/loot-single-comment";
import { Spinner } from "@lootlog/ui/components/spinner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getLootsControllerGetCommentsQueryKey,
  invalidateLootsControllerGetComments,
  useLootsControllerCreateComment,
  useLootsControllerGetComments,
} from "@lootlog/client/main";

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
      <div className="flex items-center justify-between border-b border-border px-5 py-3 sm:px-6">
        <h3 className="text-sm font-semibold text-foreground">
          {t("loots.details.comments.title", { count: comments?.length ?? 0 })}
        </h3>
      </div>

      <div className="border-b border-border bg-card/20 px-5 py-4 sm:px-6">
        <form className="space-y-3" onSubmit={handleAddComment}>
          <Textarea
            className="min-h-24 w-full resize-y rounded-xl border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary/60"
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
              className="h-8 min-w-32 cursor-pointer"
              size="sm"
              type="submit"
              disabled={isSubmitDisabled}
            >
              {isPending ? (
                <Spinner className="h-4 w-4" />
              ) : (
                t("loots.details.comments.submit")
              )}
            </Button>
          </div>
        </form>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center px-5 py-6">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      )}
      {isError && (
        <p className="px-5 py-6 text-center text-sm text-destructive sm:px-6">
          {t("loots.details.comments.error")}
        </p>
      )}
      {!isLoading && !isError && comments?.length === 0 && (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground sm:px-6">
          {t("loots.details.comments.empty")}
        </p>
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
