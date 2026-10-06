import { Copy, Pin, Trash2, VolumeX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GlobalChatMessageResponse } from "@lootlog/client/main";
import { GLOBAL_CHAT_MUTE_DURATIONS_MINUTES } from "@lootlog/schema/chat";
import { ConfirmPopover } from "@/components/confirm-popover";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { copyChatText } from "@/features/chat/chat-copy-text";
import type { GlobalChatChannel } from "@/store/global-chat.store";
import {
  useGlobalChatModeration,
  type GlobalChatMuteDuration,
} from "../hooks/use-global-chat-moderation";

const MUTE_DURATIONS: GlobalChatMuteDuration[] = [
  ...GLOBAL_CHAT_MUTE_DURATIONS_MINUTES,
  null,
];

const ICON_CLASS_NAME = "ll:mr-2 ll:size-3.5 ll:shrink-0";

type GlobalChatMessageMenuProps = {
  channel: GlobalChatChannel;
  message: GlobalChatMessageResponse;
  canModerate: boolean;
};

/** Copy for everyone; pin, delete and mute for global chat admins. */
export const GlobalChatMessageMenu = ({
  channel,
  message,
  canModerate,
}: GlobalChatMessageMenuProps) => {
  const { t } = useTranslation("globalChat");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { deleteMessage, pinMessage, muteSender, isPending } =
    useGlobalChatModeration(channel);

  return (
    <ContextMenuContent
      aria-label={t("messageActions.label")}
      className="ll:w-44 ll:flex ll:flex-col"
    >
      <ContextMenuItem onClick={() => void copyChatText(message.message)}>
        <Copy aria-hidden strokeWidth={1.5} className={ICON_CLASS_NAME} />
        {t("messageActions.copy")}
      </ContextMenuItem>
      {canModerate ? (
        <>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => pinMessage(message.id)}
          >
            <Pin aria-hidden strokeWidth={1.5} className={ICON_CLASS_NAME} />
            {t("messageActions.pin")}
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={isPending}>
              <VolumeX
                aria-hidden
                strokeWidth={1.5}
                className={ICON_CLASS_NAME}
              />
              {t("messageActions.mute")}
            </ContextMenuSubTrigger>
            <ContextMenuContent className="ll:w-32">
              {MUTE_DURATIONS.map((duration) => (
                <ContextMenuItem
                  key={duration ?? "permanent"}
                  onClick={() => muteSender(message.id, duration)}
                >
                  {t(`mute.durations.${duration ?? "permanent"}`)}
                </ContextMenuItem>
              ))}
            </ContextMenuContent>
          </ContextMenuSub>
          <ConfirmPopover
            open={deleteConfirmOpen}
            onOpenChange={setDeleteConfirmOpen}
            side="right"
            title={t("messageActions.deleteConfirm.title")}
            description={t("messageActions.deleteConfirm.description")}
            confirmLabel={t("messageActions.delete")}
            onConfirm={() => {
              setDeleteConfirmOpen(false);
              deleteMessage(message.id);
            }}
            trigger={
              <ContextMenuItem
                disabled={isPending}
                // Keeps the menu open while the confirmation is shown.
                onSelect={(event) => event.preventDefault()}
              >
                <Trash2
                  aria-hidden
                  strokeWidth={1.5}
                  className={ICON_CLASS_NAME}
                />
                {t("messageActions.delete")}
              </ContextMenuItem>
            }
          />
        </>
      ) : null}
    </ContextMenuContent>
  );
};
