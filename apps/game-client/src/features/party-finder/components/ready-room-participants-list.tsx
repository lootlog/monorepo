import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { ReadyRoomParticipantItem } from "@/features/party-finder/components/ready-room-participant-item";

type ReadyRoomParticipantsListProps = {
  room: PartyReadyRoomOrganizerProjection;
};

export function ReadyRoomParticipantsList({
  room,
}: ReadyRoomParticipantsListProps) {
  const { t } = useTranslation("partyFinder");
  const participants = Object.values(room.participants).filter(
    ({ application }) =>
      application === "APPLIED" || application === "ACCEPTED",
  );

  if (participants.length === 0) {
    return (
      <div className="ll:py-3 ll:text-center ll:text-[11px] ll:text-gray-400">
        {t("list.waiting")}
      </div>
    );
  }

  return (
    <ul className="ll:p-1.5">
      {participants.map((participant) => (
        <li key={participant.discordId}>
          <ReadyRoomParticipantItem room={room} participant={participant} />
        </li>
      ))}
    </ul>
  );
}
