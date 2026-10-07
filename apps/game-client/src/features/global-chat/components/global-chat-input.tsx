import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorStatus } from "@lootlog/client/transport";
import {
  useGlobalChatControllerSendMessage,
  type GlobalChatMessageResponse,
  type GlobalChatViewer,
  type SendGlobalChatMessageRequest,
} from "@lootlog/client/main";
import { GLOBAL_CHAT_MESSAGE_MAX_LENGTH } from "@lootlog/schema/chat";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { toWorldOption } from "@/components/world-combobox";
import { useGameStore } from "@/store/game.store";
import {
  getGlobalChatWorld,
  type GlobalChatChannel,
} from "@/store/global-chat.store";
import { format } from "@/utils/local-date";
import { GlobalChatEmojiPicker } from "./global-chat-emoji-picker";

type GlobalChatInputProps = {
  channel: GlobalChatChannel;
  viewer: GlobalChatViewer | undefined;
  onSent: (message: GlobalChatMessageResponse) => void;
  /** A refused send may mean the caller was muted since the history loaded. */
  onRefused: () => void;
};

const sendErrorKey = (status: number | undefined) => {
  if (status === 403) return "errors.muted";

  if (status === 404) return "errors.channelGone";

  if (status === 429) return "errors.rateLimited";

  return "errors.sendFailed";
};

/**
 * Plain text and emoji: Enter sends, and a failed send keeps the draft. An
 * admin may send one message to every channel; the choice resets once sent.
 */
export const GlobalChatInput = ({
  channel,
  viewer,
  onSent,
  onRefused,
}: GlobalChatInputProps) => {
  const { t } = useTranslation("globalChat");
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [allWorlds, setAllWorlds] = useState(false);
  const currentWorld = useGameStore((state) => state.game?.world);
  const world = getGlobalChatWorld(channel);
  const message = draft.trim();
  const muted = viewer?.muted ?? false;
  const isAdmin = viewer?.isAdmin ?? false;

  const { mutate, isPending } = useGlobalChatControllerSendMessage({
    mutation: {
      onSuccess: (sent) => {
        onSent(sent);
        setDraft("");
        setAllWorlds(false);
      },
      onError: (error) => {
        const status = getApiErrorStatus(error);

        toast.error(t(sendErrorKey(status)));

        if (status === 403) onRefused();
      },
    },
  });

  const insertEmoji = (emoji: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? draft.length;
    const end = input?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);

    if (next.length > GLOBAL_CHAT_MESSAGE_MAX_LENGTH) return;
    setDraft(next);
    // The caret follows the emoji once React writes the new value.
    requestAnimationFrame(() =>
      input?.setSelectionRange(start + emoji.length, start + emoji.length),
    );
  };

  const placeholder = muted
    ? viewer?.mutedUntil
      ? t("input.mutedUntil", {
          date: format(new Date(viewer.mutedUntil), "dd.MM.yyyy HH:mm"),
        })
      : t("input.mutedPermanently")
    : allWorlds
      ? t("input.allWorldsPlaceholder")
      : world === undefined
        ? t("input.sharedPlaceholder")
        : t("input.worldPlaceholder", { world: toWorldOption(world).label });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!message || isPending || muted) return;
        const data: SendGlobalChatMessageRequest = { message };

        if (world !== undefined) data.world = world;
        // Only the shared channel tags where its senders write from.
        else if (currentWorld) data.originWorld = currentWorld;

        if (isAdmin && allWorlds) data.allWorlds = true;
        mutate({ data });
      }}
    >
      <WindowFooter
        className="ll:relative"
        rowClassName="ll:gap-0.5 ll:pl-1 ll:pr-0.5"
      >
        <Input
          ref={inputRef}
          variant="borderless"
          value={draft}
          readOnly={isPending}
          disabled={muted}
          maxLength={GLOBAL_CHAT_MESSAGE_MAX_LENGTH}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          // Matches the chat window's compose editor.
          className="ll:h-full ll:flex-1 ll:px-1 ll:pt-0 ll:text-xs ll:leading-[14px]"
          onChange={(event) => setDraft(event.target.value)}
        />
        {isPending ? (
          <Loader2
            aria-label={t("input.pending")}
            className="ll:pointer-events-none ll:size-3.5 ll:shrink-0 ll:animate-spin ll:motion-reduce:animate-none"
          />
        ) : null}
        {isAdmin ? (
          <IconButton
            label={t("input.allWorlds")}
            active={allWorlds}
            disabled={muted || isPending}
            onClick={() => setAllWorlds((current) => !current)}
          >
            <Megaphone aria-hidden className="ll:size-3.5" />
          </IconButton>
        ) : null}
        <GlobalChatEmojiPicker
          disabled={muted || isPending}
          onPick={insertEmoji}
        />
      </WindowFooter>
    </form>
  );
};
