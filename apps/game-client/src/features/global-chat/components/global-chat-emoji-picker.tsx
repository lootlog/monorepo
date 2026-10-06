import { Smile } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * A fixed set, so the picker loads nothing. Mostly Unicode 6–9 emoji, which
 * the oldest supported systems still draw.
 */
const EMOJI = [
  "😀",
  "😂",
  "🤣",
  "😅",
  "😊",
  "🙂",
  "😉",
  "😍",
  "😎",
  "😜",
  "😇",
  "🤔",
  "😐",
  "🙄",
  "😴",
  "😱",
  "😭",
  "😡",
  "😈",
  "💀",
  "👀",
  "🤝",
  "👋",
  "🙏",
  "👍",
  "👎",
  "👌",
  "👏",
  "💪",
  "✌️",
  "❤️",
  "💔",
  "🔥",
  "⭐",
  "✨",
  "💯",
  "🎉",
  "🍀",
  "💰",
  "💎",
  "👑",
  "⚔️",
  "🛡️",
  "🏹",
  "🐉",
  "🎯",
  "⏰",
  "✅",
  "❌",
  "❓",
  "❗",
  "💤",
];

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
      <PopoverContent
        side="top"
        align="end"
        className="ll:grid ll:w-auto ll:grid-cols-8 ll:gap-0.5 ll:p-1"
      >
        {EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="ll:flex ll:size-7 ll:items-center ll:justify-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:text-base ll:leading-none ll:hover:bg-white/10 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll-custom-cursor-pointer"
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
