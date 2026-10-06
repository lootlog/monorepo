import { Pin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GlobalChatMessageResponse } from "@lootlog/client/main";
import { IconButton } from "@/components/ui/icon-button";
import type { GlobalChatChannel } from "@/store/global-chat.store";
import { getGlobalChatColor } from "../global-chat.helpers";
import { useGlobalChatModeration } from "../hooks/use-global-chat-moderation";

type GlobalChatPinnedProps = {
  channel: GlobalChatChannel;
  message: GlobalChatMessageResponse;
  canUnpin: boolean;
};

/** The message an admin pinned above the channel's history. */
export const GlobalChatPinned = ({
  channel,
  message,
  canUnpin,
}: GlobalChatPinnedProps) => {
  const { t } = useTranslation("globalChat");
  const { unpinMessage, isPending } = useGlobalChatModeration(channel);

  return (
    <section
      aria-label={t("pinned.label")}
      className="ll:flex ll:shrink-0 ll:items-start ll:gap-1.5 ll:border-x-0 ll:border-t-0 ll:border-b ll:border-solid ll:border-amber-400/40 ll:bg-amber-400/10 ll:px-1.5 ll:py-1 ll:text-xs"
    >
      <Pin
        aria-hidden
        className="ll:mt-0.5 ll:size-3 ll:shrink-0 ll:text-amber-300"
      />
      <p
        className="ll:m-0 ll:min-w-0 ll:flex-1 ll:select-text ll:whitespace-pre-wrap"
        style={{ overflowWrap: "anywhere" }}
      >
        <span
          className="ll:font-bold"
          style={{ color: getGlobalChatColor(message.displayName) }}
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
          className="ll:-my-0.5 ll:shrink-0"
        >
          <X aria-hidden className="ll:size-3" />
        </IconButton>
      ) : null}
    </section>
  );
};
