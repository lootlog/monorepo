import { Pin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GlobalChatMessageResponse } from "@lootlog/client/main";
import { Notice } from "@/components/notice";
import { IconButton } from "@/components/ui/icon-button";
import type { GlobalChatChannel } from "@/store/global-chat.store";
import { getGlobalChatSenderColor } from "../global-chat.helpers";
import { useGlobalChatModeration } from "../hooks/use-global-chat-moderation";

type GlobalChatPinnedProps = {
  channel: GlobalChatChannel;
  message: GlobalChatMessageResponse;
  canUnpin: boolean;
};

export const GlobalChatPinned = ({
  channel,
  message,
  canUnpin,
}: GlobalChatPinnedProps) => {
  const { t } = useTranslation("globalChat");
  const { unpinMessage, isPending } = useGlobalChatModeration(channel);

  return (
    <Notice
      role="region"
      aria-label={t("pinned.label")}
      tone="warning"
      layout="strip"
      icon=<Pin />
      className="ll:mt-0 ll:shrink-0 ll:border-t-0 ll:text-xs"
    >
      <p
        className="ll:m-0 ll:min-w-0 ll:flex-1 ll:select-text ll:whitespace-pre-wrap"
        style={{ overflowWrap: "anywhere" }}
      >
        <span
          className="ll:font-bold"
          style={{ color: getGlobalChatSenderColor(message) }}
        >
          {message.displayName}:
        </span>{" "}
        {message.message}
      </p>
      {canUnpin ? (
        <IconButton
          label={t("pinned.unpin")}
          disabled={isPending}
          onClick={unpinMessage}
          className="ll:-my-1 ll:-mr-1.5 ll:shrink-0"
        >
          <X aria-hidden />
        </IconButton>
      ) : null}
    </Notice>
  );
};
