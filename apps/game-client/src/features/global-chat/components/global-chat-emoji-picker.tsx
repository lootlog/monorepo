import { Smile } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { GlobalChatEmojiPanel } from "./global-chat-emoji-panel";

type GlobalChatEmojiPickerProps = {
  disabled: boolean;
  onPick: (emoji: string) => void;
};

/** Inserts one emoji at the caret and stays open for the next. */
export const GlobalChatEmojiPicker = ({
  disabled,
  onPick,
}: GlobalChatEmojiPickerProps) => {
  const { t } = useTranslation("globalChat");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton label={t("input.emoji")} disabled={disabled}>
          <Smile aria-hidden className="ll:size-3.5" />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="ll:w-auto ll:p-1">
        <GlobalChatEmojiPanel onPick={onPick} />
      </PopoverContent>
    </Popover>
  );
};
