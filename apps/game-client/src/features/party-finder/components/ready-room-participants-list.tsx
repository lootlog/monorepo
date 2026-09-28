import type { PartyReadyRoomOrganizerProjection } from "@lootlog/schema/party-ready-room";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/empty-state";
import { useGatheringPartyState } from "@/components/common/use-gathering-party-state";
import { ReadyRoomParticipantItem } from "@/features/party-finder/components/ready-room-participant-item";

type ReadyRoomParticipantsListProps = {
  room: PartyReadyRoomOrganizerProjection;
  stale?: boolean;
};

export function ReadyRoomParticipantsList({
  room,
  stale,
}: ReadyRoomParticipantsListProps) {
  const { t } = useTranslation("partyFinder");
  const participants = Object.values(room.participants);

  const { observation, isStale } = useGatheringPartyState(
    room.partyState,
    stale,
  );

  const partyIds = new Set(
    observation?.members.map((member) => member.characterId),
  );

  if (participants.length === 0) {
    return <EmptyState title={t("list.waiting")} />;
  }

  return (
    <ul className="ll:m-0 ll:list-none ll:p-0">
      {participants.map((participant) => (
        <li key={participant.participantId}>
          <ReadyRoomParticipantItem
            room={room}
            participant={participant}
            inParty={
              observation && !isStale
                ? partyIds.has(participant.character.characterId)
                : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
