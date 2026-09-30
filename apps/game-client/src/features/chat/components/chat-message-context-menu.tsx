import { copyChatText } from "../chat-copy-text";
import { ConfirmPopover } from "@/components/confirm-popover";
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
import {
  Copy,
  MessageCircle,
  Reply,
  Trash2,
  Shirt,
  UserPlus,
  Users,
  UserRound,
} from "lucide-react";
import { type FC, useState } from "react";
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <ContextMenuContent className="ll:w-44 ll:flex ll:flex-col">
      <ContextMenuItem onClick={() => void copyChatText(message.message)}>
        <Copy
          aria-hidden="true"
          strokeWidth={1.5}
          className="ll:mr-2 ll:size-3.5 ll:shrink-0"
        />
        {t("messageActions.copy")}
      </ContextMenuItem>
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => startPrivateMessage(characterData.nick)}
        >
          <MessageCircle
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.sendMessage")}
        </ContextMenuItem>
      )}
      {canReply && onReply && (
        <ContextMenuItem onClick={onReply}>
          <Reply
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.reply")}
        </ContextMenuItem>
      )}
      {canDelete && (
        <ConfirmPopover
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          side="right"
          title={t("contextMenu.deleteConfirm.title")}
          description={t("contextMenu.deleteConfirm.description")}
          confirmLabel={t("contextMenu.delete")}
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            onDelete();
          }}
          trigger={
            <ContextMenuItem
              disabled={isDeleting}
              // Keeps the menu open while the confirmation is shown.
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2
                aria-hidden="true"
                strokeWidth={1.5}
                className="ll:mr-2 ll:size-3.5 ll:shrink-0"
              />
              {t("contextMenu.delete")}
            </ContextMenuItem>
          }
        />
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
          <Shirt
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.showEquipment")}
        </ContextMenuItem>
      )}
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => inviteCharacterToFriends(characterData.nick)}
        >
          <UserPlus
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.inviteFriends")}
        </ContextMenuItem>
      )}
      {!isCurrentCharacter && (
        <ContextMenuItem
          onClick={() => inviteCharacterToParty(characterData.id)}
        >
          <Users
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
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
          <UserRound
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("contextMenu.showProfile")}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  );
};
