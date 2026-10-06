import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGlobalChatControllerGetMutesQueryKey,
  useGlobalChatControllerDeleteMessage,
  useGlobalChatControllerMuteSender,
  useGlobalChatControllerPinMessage,
  useGlobalChatControllerUnmuteSender,
  useGlobalChatControllerUnpinMessage,
} from "@lootlog/client/main";
import type { GLOBAL_CHAT_MUTE_DURATIONS_MINUTES } from "@lootlog/schema/chat";
import {
  getGlobalChatWorld,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import {
  removeGlobalChatMessage,
  setGlobalChatPinned,
  type GlobalChatPages,
} from "../global-chat.helpers";
import { getGlobalChatMessagesQueryKey } from "./use-global-chat";

export type GlobalChatMuteDuration =
  | (typeof GLOBAL_CHAT_MUTE_DURATIONS_MINUTES)[number]
  | null;

/**
 * Admin actions on one channel. Each applies its result to the loaded
 * history at once; the gateway's broadcast of the same change is idempotent.
 */
export const useGlobalChatModeration = (channel: GlobalChatChannel) => {
  const { t } = useTranslation("globalChat");
  const queryClient = useQueryClient();
  const world = getGlobalChatWorld(channel);
  const channelParams = world === undefined ? {} : { world };

  const update = (
    change: (data: GlobalChatPages | undefined) => GlobalChatPages | undefined,
  ) =>
    queryClient.setQueryData<GlobalChatPages>(
      getGlobalChatMessagesQueryKey(channel),
      change,
    );

  const onError = () => {
    toast.error(t("errors.moderationFailed"));
  };

  const deleteMutation = useGlobalChatControllerDeleteMessage({
    mutation: {
      onSuccess: (_, { pathParams }) =>
        update((data) => removeGlobalChatMessage(data, pathParams.messageId)),
      onError,
    },
  });

  const pinMutation = useGlobalChatControllerPinMessage({
    mutation: {
      onSuccess: (pinned) =>
        update((data) => setGlobalChatPinned(data, pinned)),
      onError,
    },
  });

  const unpinMutation = useGlobalChatControllerUnpinMessage({
    mutation: {
      onSuccess: () => update((data) => setGlobalChatPinned(data, null)),
      onError,
    },
  });

  const muteMutation = useGlobalChatControllerMuteSender({
    mutation: {
      onSuccess: (mute) => {
        toast.success(t("mute.muted", { name: mute.displayName }));
        void queryClient.invalidateQueries({
          queryKey: getGlobalChatControllerGetMutesQueryKey(),
        });
      },
      onError,
    },
  });

  return {
    deleteMessage: (messageId: string) =>
      deleteMutation.mutate({
        pathParams: { messageId },
        params: channelParams,
      }),
    pinMessage: (messageId: string) =>
      pinMutation.mutate({ data: { ...channelParams, messageId } }),
    unpinMessage: () => unpinMutation.mutate({ params: channelParams }),
    muteSender: (messageId: string, durationMinutes: GlobalChatMuteDuration) =>
      muteMutation.mutate({
        data: { ...channelParams, messageId, durationMinutes },
      }),
    isPending:
      deleteMutation.isPending ||
      pinMutation.isPending ||
      unpinMutation.isPending ||
      muteMutation.isPending,
  };
};

/** Lifting a mute refreshes the admin's list. */
export const useGlobalChatUnmute = () => {
  const { t } = useTranslation("globalChat");
  const queryClient = useQueryClient();

  return useGlobalChatControllerUnmuteSender({
    mutation: {
      onSuccess: () =>
        void queryClient.invalidateQueries({
          queryKey: getGlobalChatControllerGetMutesQueryKey(),
        }),
      onError: () => {
        toast.error(t("errors.moderationFailed"));
      },
    },
  });
};
