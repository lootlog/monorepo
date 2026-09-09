import type { ChatMessageResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useChatQuickActions } from "../hooks/use-chat-quick-actions";
import { MessageType } from "@/api/chat.api";

export function ChatNotificationComingAction({
  message,
}: {
  message: ChatMessageResponseDtoOutput;
}) {
  const { t } = useTranslation("chat");
  const { sendComing, isPending } = useChatQuickActions();
  return (
    <Button
      variant="ghost"
      className="ll:h-6 ll:px-1.5"
      disabled={isPending}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() =>
        void sendComing({
          guildId: message.guildId,
          messageId: message.id,
          senderNick: message.characterData.nick,
          message: message.message,
          type: MessageType.NOTIFICATION,
        })
      }
    >
      {t("messageActions.coming")}
    </Button>
  );
}
