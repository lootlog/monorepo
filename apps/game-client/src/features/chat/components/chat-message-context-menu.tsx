import { copyChatText } from "../chat-copy-text";
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
  showCharacterEquipment,
  showCharacterProfile,
  startPrivateMessage,
} from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type ChatMessageContextMenuProps = {
  canDelete: boolean;
  canReply: boolean;
  gameInterface?: string;
  heroName?: string;
  isDeleting: boolean;
  message: ChatMessageType & {
    characterData: NonNullable<ChatMessageType["characterData"]>;
  };
  onDelete: () => void;
  onReply?: () => void;
};

export const ChatMessageContextMenu: FC<ChatMessageContextMenuProps> = ({
  canDelete,
  canReply,
  gameInterface,
  heroName,
  isDeleting,
  message,
  onDelete,
  onReply,
}) => {
  const { t } = useTranslation("chat");
  const { characterData } = message;
  const isCurrentCharacter = characterData.nick === heroName;
  const isNewInterface = gameInterface === "ni";

  return (
    <ContextMenuContent className="ll:w-48 ll:flex ll:flex-col">
      <ContextMenuItem onClick={() => void copyChatText(message.message)}>
        {t("messageActions.copy")}
      </ContextMenuItem>
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => startPrivateMessage(characterData.nick)}
        >
          {t("contextMenu.sendMessage")}
        </ContextMenuItem>
      )}
      {canReply && onReply && (
        <ContextMenuItem onClick={onReply}>
          {t("contextMenu.reply")}
        </ContextMenuItem>
      )}
      {canDelete && (
        <ContextMenuItem disabled={isDeleting} onClick={onDelete}>
          {t("contextMenu.delete")}
        </ContextMenuItem>
      )}
      {isNewInterface && (
        <ContextMenuItem
          onClick={() =>
            showCharacterEquipment({
              id: characterData.id,
              nick: characterData.nick,
              prof: characterData.prof,
              icon: characterData.icon,
              lvl: characterData.lvl,
              account: characterData.acc,
            })
          }
        >
          {t("contextMenu.showEquipment")}
        </ContextMenuItem>
      )}
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => inviteCharacterToFriends(characterData.nick)}
        >
          {t("contextMenu.inviteFriends")}
        </ContextMenuItem>
      )}
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => inviteCharacterToParty(characterData.id)}
        >
          {t("contextMenu.inviteParty")}
        </ContextMenuItem>
      )}
      {isNewInterface && (
        <ContextMenuItem
          onClick={() =>
            showCharacterProfile({
              accountId: characterData.acc,
              characterId: characterData.id,
            })
          }
        >
          {t("contextMenu.showProfile")}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};
