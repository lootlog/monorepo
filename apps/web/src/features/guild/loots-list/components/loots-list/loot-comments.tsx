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
} from "@lootlog/api-client/react-query/main/loots";

const MAX_LENGTH = 256;

type LootCommentProps = {
  lootId: number;
};

export const LootComments: FC<LootCommentProps> = ({ lootId }) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { data: comments } = useLootsControllerGetComments(
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
      },
    },
  });
  const [value, setValue] = useState("");

  const handleAddComment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.length === 0 || value.length > MAX_LENGTH || !guildId) {
      return;
    }

    createComment({
      pathParams: { guildId, lootId },
      data: { content: value },
    });
    setValue("");
  };

  return (
    <div className="space-y-2 flex flex-col">
      <div className="p-4 flex flex-col border-b border-border/50 gap-2 bg-card/20">
        <form onSubmit={handleAddComment}>
          <Textarea
            className="w-full h-24 p-2 rounded-lg bg-secondary/50 border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary/50"
            placeholder={t("loots.details.comments.placeholder")}
            autoFocus={false}
            maxLength={MAX_LENGTH}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {value.length}/{MAX_LENGTH}
            </span>
            <Button
              className="mt-2 h-8 w-32"
              size="sm"
              type="submit"
              disabled={
                value.length === 0 || value.length > MAX_LENGTH || isPending
              }
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

      <h3 className="text-sm font-semibold px-4 pb-2 border-b border-border/50 text-foreground">
        {t("loots.details.comments.title", { count: comments?.length || 0 })}
      </h3>
      <ul className="p-0 !m-0">
        {comments?.map((comment) => (
          <LootSingleComment key={comment.id} comment={comment} />
        ))}
      </ul>
    </div>
  );
};
