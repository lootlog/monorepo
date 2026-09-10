import { format, isToday, isYesterday } from "@/utils/local-date";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Marker } from "@/components/ui/marker";

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
    <Marker role="separator" aria-label={label}>
      {label}
    </Marker>
  );
};
