import { format, isToday, isYesterday } from "date-fns";
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
      className="ll:flex ll:w-full ll:items-center ll:gap-2 ll:py-1 ll:select-none"
      role="separator"
      aria-label={label}
    >
      <div className="ll:h-px ll:flex-1 ll:bg-gray-700/80" />
      <span className="ll:px-2 ll:py-0.5 ll:text-[10px] ll:font-semibold ll:uppercase ll:tracking-[0.08em] ll:text-gray-400">
        {label}
      </span>
      <div className="ll:h-px ll:flex-1 ll:bg-gray-700/80" />
    </div>
  );
};
