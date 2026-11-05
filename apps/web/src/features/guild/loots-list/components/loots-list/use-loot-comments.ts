import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  invalidateLootsControllerGetComments,
  useLootsControllerCreateComment,
  useLootsControllerGetComments,
} from "@lootlog/client/main";

export const LOOT_COMMENT_MAX_LENGTH = 256;

/** A loot's comments, newest first, and the draft of the next one. */
export const useLootComments = (lootId: number) => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  const commentsQuery = useLootsControllerGetComments(
    { guildId: guildId ?? "", lootId },
    { query: { enabled: !!guildId && !!lootId } },
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
    normalizedValue.length === 0 ||
    value.length > LOOT_COMMENT_MAX_LENGTH ||
    isPending;

  const submit = () => {
    if (isSubmitDisabled || !guildId) {
      return;
    }

    createComment({
      pathParams: { guildId, lootId },
      data: { content: normalizedValue },
    });
  };

  return {
    commentsQuery,
    value,
    setValue,
    submit,
    isPending,
    isSubmitDisabled,
  };
};

export type LootCommentsState = ReturnType<typeof useLootComments>;
