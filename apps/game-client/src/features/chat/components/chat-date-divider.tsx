import { format, isToday, isYesterday } from "@/utils/local-date";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type ChatDateDividerProps = {
  timestamp: string;
};

export const ChatDateDivider: FC<ChatDateDividerProps> = ({ timestamp }) => {
  const { t } = useTranslation("chat");
  const messageDate = new Date(timestamp);

  const label = isToday(messageDate)
    ? t("dateDividers.today")
    : isYesterday(messageDate)
      ? t("dateDividers.yesterday")
      : format(messageDate, "dd.MM.yyyy");

  return (
    <div
      className="ll:flex ll:w-full ll:items-center ll:gap-[var(--ll-chat-space-lg)] ll:py-[var(--ll-chat-space-sm)] ll:select-none"
      role="separator"
      aria-label={label}
    >
      <div className="ll:h-px ll:flex-1 ll:bg-gray-700/80" />
      <span className="ll:px-[var(--ll-chat-space-lg)] ll:py-[var(--ll-chat-space-xs)] ll:text-[length:var(--ll-chat-detail-font-size)] ll:leading-[var(--ll-chat-detail-line-height)] ll:font-semibold ll:uppercase ll:tracking-[0.08em] ll:text-gray-400">
        {label}
      </span>
      <div className="ll:h-px ll:flex-1 ll:bg-gray-700/80" />
    </div>
  );
};
