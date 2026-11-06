import { useTranslation } from "react-i18next";
import { useReadyRoomMinutesLeft } from "@/components/common/use-ready-room-minutes-left";

type ReadyRoomExpiryProps = {
  expiresAt: string;
};

/** Whole minutes left before the gathering lapses, rounded up. */
export function ReadyRoomExpiry({ expiresAt }: ReadyRoomExpiryProps) {
  const { t } = useTranslation("partyFinder");
  const minutes = useReadyRoomMinutesLeft(expiresAt);

  return (
    <span className="ll:shrink-0 ll:tabular-nums ll:text-muted-foreground">
      {minutes > 0 ? t("header.expiresIn", { minutes }) : t("header.expiring")}
    </span>
  );
}
