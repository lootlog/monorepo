import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageType } from "@/api/chat.api";
import {
  getChatControllerGetChatMessagesQueryKey,
  useChatControllerSendChatMessage,
} from "@/lib/api/generated/main/chat/chat";
import { useMessagingControllerSendNotification } from "@/lib/api/generated/main/messaging/messaging";
import { buildChatCharacterData } from "@/lib/api/generated-helpers";
import { Game } from "@/lib/game";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import type { ChatMessageResponseDtoOutput } from "@/lib/api/generated/main/model";

type ChatInputProps = {
  selectedGuildId?: string;
  autofocus?: boolean;
};

const FormSchema = z.object({
  message: z.string().min(1).max(120),
});

type FormData = z.infer<typeof FormSchema>;

export const ChatInput: FC<ChatInputProps> = ({
  selectedGuildId,
  autofocus,
}) => {
  const { t } = useTranslation("chat");
  const queryClient = useQueryClient();
  const world = Game.getWorldName();
  const { mutateAsync: sendChatMessage, isPending: isSendingMessage } =
    useChatControllerSendChatMessage();
  const { mutateAsync: createNotification, isPending: isCreatingNotification } =
    useMessagingControllerSendNotification();
  const { handlePartyCommand } = usePartyCommand();

  const { watch, setValue, handleSubmit } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageValue = watch("message");
  const isPending = isSendingMessage || isCreatingNotification;

  const onSubmit = async (data: FormData) => {
    if (!selectedGuildId || !world) {
      return;
    }

    if (data.message.startsWith("!grp")) {
      const description = data.message.slice("!grp".length).trim() || undefined;
      handlePartyCommand(description, [selectedGuildId]);
      setValue("message", "");
      return;
    }

    const isNotificationEnabled = data.message.startsWith("!");
    const message =
      isNotificationEnabled && data.message.length > 1
        ? data.message.slice(1)
        : data.message;

    try {
      if (isNotificationEnabled) {
        await createNotification({
          data: {
            guildIds: [selectedGuildId],
            message,
            world,
          },
        });
      }

      const response = await sendChatMessage({
        pathParams: { guildId: selectedGuildId },
        data: {
          message,
          type: isNotificationEnabled
            ? MessageType.NOTIFICATION
            : MessageType.NORMAL,
          characterData: buildChatCharacterData(),
        },
      });

      queryClient.setQueryData(
        getChatControllerGetChatMessagesQueryKey({ guildId: selectedGuildId }),
        (old: ChatMessageResponseDtoOutput[] | undefined) =>
          upsertChatMessage(old, response),
      );
      setValue("message", "");
    } catch {
      return;
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      className="ll:flex ll:justify-center ll:flex-col ll:mt-1"
    >
      <Label className="ll:text-[9px] ll:text-gray-400">
        {t("input.hint")}
      </Label>
      <Input
        autoComplete="off"
        placeholder={t("input.placeholder")}
        autoFocus={autofocus}
        disabled={isPending}
        value={messageValue}
        onChange={(event) => setValue("message", event.target.value)}
      />
    </form>
  );
};
