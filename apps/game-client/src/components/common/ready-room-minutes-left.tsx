import { useTranslation } from "react-i18next";
import { useReadyRoomMinutesLeft } from "@/components/common/use-ready-room-minutes-left";

type Props = {
  expiresAt: string;
};

/** The compact countdown of a gathering card. */
export function ReadyRoomMinutesLeft({ expiresAt }: Props) {
  const { t } = useTranslation("chat");
  const minutes = useReadyRoomMinutesLeft(expiresAt);

  return (
    <span
      className="ll:shrink-0 ll:whitespace-nowrap ll:text-[11px] ll:tabular-nums ll:text-[#b7adbe]"
      title={
        minutes > 0 ? t("gatherings.minutesLeftLabel", { minutes }) : undefined
      }
    >
      {minutes > 0
        ? t("gatherings.minutesLeft", { minutes })
        : t("gatherings.expiring")}
    </span>
  );
}
