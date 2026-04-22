import { useMessagingControllerSendNotification } from "@/lib/api/generated/main/messaging/messaging";

type StartNotificationMessageOptions<TResult> = {
  guildIds: string[];
  world: string;
  message: string;
  sendChatMessage: (guildIds: string[]) => Promise<TResult>;
};

export const useNotificationChatOrchestration = () => {
  const { mutateAsync: createNotificationAsync, isPending } =
    useMessagingControllerSendNotification();

  const startNotificationMessage = async <TResult>({
    guildIds,
    world,
    message,
    sendChatMessage,
  }: StartNotificationMessageOptions<TResult>) => {
    const response = await createNotificationAsync({
      data: {
        guildIds,
        message,
        world,
      },
    });
    const resolvedGuildIds = response.guildIds ?? guildIds;
    const result = await sendChatMessage(resolvedGuildIds);

    return {
      guildIds: resolvedGuildIds,
      notificationId: response.notificationId,
      result,
    };
  };

  return {
    isCreatingNotificationMessage: isPending,
    startNotificationMessage,
  };
};
