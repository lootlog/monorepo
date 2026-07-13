import type { PartyReadyRoomParticipantProjection } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type ReadyRoomSelectorProps = {
  rooms: PartyReadyRoomParticipantProjection[];
  selectedRoomId: string;
  onSelect: (notificationId: string) => void;
};

export function ReadyRoomSelector({
  rooms,
  selectedRoomId,
  onSelect,
}: ReadyRoomSelectorProps) {
  const { t } = useTranslation("partyFinder");

  return (
    <div className="ll:border-b ll:border-gray-700 ll:bg-gray-950/70 ll:p-1.5">
      <div className="ll:mb-1 ll:text-[9px] ll:uppercase ll:tracking-wide ll:text-gray-500">
        {t("labels.applications")}
      </div>
      <div className="ll:flex ll:gap-1 ll:overflow-x-auto">
        {rooms.map((room) => (
          <Button
            key={room.notificationId}
            className={
              room.notificationId === selectedRoomId
                ? "ll:border-amber-500/70 ll:bg-amber-600/20 ll:text-amber-200"
                : "ll:border-gray-700 ll:bg-gray-900 ll:text-gray-300"
            }
            onClick={() => onSelect(room.notificationId)}
          >
            {room.organizerCharacter.nick}
          </Button>
        ))}
      </div>
    </div>
  );
}
