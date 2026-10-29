import { ContextMenuItem } from "@/components/ui/context-menu";
import type { ChatMessageResponseDtoOutputNpc as ChatNpc } from "@lootlog/client/main";
import { Copy, MapPin } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { copyChatText } from "../chat-copy-text";
import { getChatNpcLocation } from "./chat-message.helpers";
import { ChatNpcHideTypeMenuItem } from "./chat-npc-hide-type-menu-item";

type ChatNpcMessageMenuProps = {
  message: string;
  npc: ChatNpc;
};

/** The items of an NPC message's menu in the transcript's shared context menu. */
export const ChatNpcMessageMenu: FC<ChatNpcMessageMenuProps> = ({
  message,
  npc,
}) => {
  const { t } = useTranslation("chat");

  return (
    <>
      <ContextMenuItem onClick={() => void copyChatText(message)}>
        <Copy
          aria-hidden="true"
          strokeWidth={1.5}
          className="ll:mr-2 ll:size-3.5 ll:shrink-0"
        />
        {t("messageActions.copy")}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => void copyChatText(getChatNpcLocation(npc))}
      >
        <MapPin
          aria-hidden="true"
          strokeWidth={1.5}
          className="ll:mr-2 ll:size-3.5 ll:shrink-0"
        />
        {t("messageActions.copyLocation")}
      </ContextMenuItem>
      <ChatNpcHideTypeMenuItem npc={npc} />
    </>
  );
};
