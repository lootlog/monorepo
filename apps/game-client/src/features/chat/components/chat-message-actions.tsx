import { Menu } from "@base-ui/react/menu";
import { AtSign, Ellipsis, Reply } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getLootlogPortalContainer } from "@/components/ui/theme-boundary";
import {
  ChatMessageContextMenu,
  type ChatMessageContextMenuProps,
} from "./chat-message-context-menu";
import { ChatNotificationComingAction } from "./chat-notification-coming-action";
import { MessageType } from "@/api/chat.api";

type ChatMessageActionsProps = ChatMessageContextMenuProps & {
  onMention?: () => void;
};

export function ChatMessageActions(props: ChatMessageActionsProps) {
  const { t } = useTranslation("chat");

  return (
    <div
      className="ll:flex ll:shrink-0 ll:items-center ll:gap-0.5"
      aria-label={t("messageActions.label")}
    >
      {props.message.type === MessageType.NOTIFICATION && (
        <ChatNotificationComingAction message={props.message} />
      )}
      <div className="ll:flex ll:gap-0.5 ll:opacity-0 ll:group-hover/message:opacity-100 ll:group-focus-within/message:opacity-100 ll:[@media(hover:none)]:opacity-100">
        {props.canReply && props.onReply && (
          <Button
            variant="ghost"
            className="ll:size-6"
            aria-label={t("contextMenu.reply")}
            title={t("contextMenu.reply")}
            onClick={props.onReply}
          >
            <Reply className="ll:size-3" />
          </Button>
        )}
        {props.onMention && (
          <Button
            variant="ghost"
            className="ll:size-6"
            aria-label={t("messageActions.mention")}
            title={t("messageActions.mention")}
            onClick={props.onMention}
          >
            <AtSign className="ll:size-3" />
          </Button>
        )}
      </div>
      <Menu.Root>
        <Menu.Trigger
          render=<Button
            variant="ghost"
            className="ll:size-6"
            aria-label={t("messageActions.more")}
            title={t("messageActions.more")}
          />
        >
          <Ellipsis className="ll:size-3" />
        </Menu.Trigger>
        <Menu.Portal container={getLootlogPortalContainer()}>
          <Menu.Positioner
            className="ll:z-[500]"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <Menu.Popup className="ll:flex ll:w-48 ll:flex-col ll:gap-0.5 ll:rounded-md ll:border ll:border-border ll:bg-popover ll:p-1 ll:text-popover-foreground ll:shadow-md">
              <Menu.Group>
                <ChatMessageContextMenu {...props} inline />
              </Menu.Group>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
