import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorStatus } from "@lootlog/client/transport";
import {
  useGlobalChatControllerSendMessage,
  type GlobalChatMessageResponse,
} from "@lootlog/client/main";
import { GLOBAL_CHAT_MESSAGE_MAX_LENGTH } from "@lootlog/schema/chat";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { Input } from "@/components/ui/input";

type GlobalChatInputProps = {
  onSent: (message: GlobalChatMessageResponse) => void;
};

const sendErrorKey = (status: number | undefined) => {
  if (status === 403) return "errors.notMember";

  if (status === 429) return "errors.rateLimited";

  return "errors.sendFailed";
};

/** Plain text only: Enter sends, and a failed send keeps the draft. */
export const GlobalChatInput = ({ onSent }: GlobalChatInputProps) => {
  const { t } = useTranslation("globalChat");
  const [draft, setDraft] = useState("");
  const message = draft.trim();

  const { mutate, isPending } = useGlobalChatControllerSendMessage({
    mutation: {
      onSuccess: (sent) => {
        onSent(sent);
        setDraft("");
      },
      onError: (error) => {
        toast.error(t(sendErrorKey(getApiErrorStatus(error))));
      },
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        if (!message || isPending) return;
        mutate({ data: { message } });
      }}
    >
      <WindowFooter className="ll:relative" rowClassName="ll:pl-1">
        <Input
          variant="borderless"
          value={draft}
          readOnly={isPending}
          maxLength={GLOBAL_CHAT_MESSAGE_MAX_LENGTH}
          placeholder={t("input.placeholder")}
          aria-label={t("input.placeholder")}
          autoComplete="off"
          // Matches the chat window's compose editor.
          className="ll:h-full ll:flex-1 ll:px-1 ll:pt-0 ll:text-xs ll:leading-[14px]"
          onChange={(event) => setDraft(event.target.value)}
        />
        {isPending ? (
          <Loader2
            aria-label={t("input.pending")}
            className="ll:pointer-events-none ll:absolute ll:right-1 ll:top-1/2 ll:size-3.5 ll:-translate-y-1/2 ll:animate-spin ll:motion-reduce:animate-none"
          />
        ) : null}
      </WindowFooter>
    </form>
  );
};
