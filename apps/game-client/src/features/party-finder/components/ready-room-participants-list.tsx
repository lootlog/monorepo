import type { PartyReadyRoomOrganizerProjection } from "@lootlog/schema/party-ready-room";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/empty-state";
import { selectParticipantsOutsideParty } from "@/features/party-finder/ready-room-cache";
import { ReadyRoomParticipantItem } from "@/features/party-finder/components/ready-room-participant-item";

type ReadyRoomParticipantsListProps = {
  room: PartyReadyRoomOrganizerProjection;
};

/**
 * Applicants still waiting for an invitation. Those already in the party are
 * left out: the party counter in the header accounts for them.
 */
export function ReadyRoomParticipantsList({
  room,
}: ReadyRoomParticipantsListProps) {
  const { t } = useTranslation("partyFinder");
  const participants = Object.values(room.participants);

  const waitingParticipants = selectParticipantsOutsideParty(room);

  if (waitingParticipants.length === 0) {
    return (
      <EmptyState
        title={t("list.waiting")}
        description={participants.length > 0 ? t("list.allInParty") : undefined}
      />
    );
  }

  return (
    <ul className="ll:m-0 ll:list-none ll:p-0">
      {waitingParticipants.map((participant, index) => (
        <li key={participant.participantId}>
          <ReadyRoomParticipantItem
            room={room}
            participant={participant}
            isAlternateRow={index % 2 === 1}
          />
        </li>
      ))}
    </ul>
  );
}
