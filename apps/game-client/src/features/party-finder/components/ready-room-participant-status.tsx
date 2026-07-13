import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { partyReadyRoomControllerWithdraw } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectReadyRoomParticipantForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";

type ReadyRoomParticipantStatusProps = {
  room: PartyReadyRoomProjection;
};

export function ReadyRoomParticipantStatus({
  room,
}: ReadyRoomParticipantStatusProps) {
  const { t } = useTranslation("partyFinder");
  const participant = selectReadyRoomParticipantForCharacter(
    room,
    getCurrentReadyRoomCharacterIdentity(),
  );
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const applyUpdate = usePartyFinderStore((state) => state.applyUpdate);

  const withdraw = async () => {
    if (!participant) return;
    setIsWithdrawing(true);
    try {
      const update = await partyReadyRoomControllerWithdraw(
        { notificationId: room.notificationId },
        { participantId: participant.participantId },
      );
      applyUpdate(update as unknown as PartyReadyRoomClientUpdate);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!participant) return null;

  return (
    <div className="ll:m-2 ll:rounded ll:border ll:border-gray-700 ll:bg-gray-950/60 ll:p-2">
      <div className="ll:flex ll:items-center ll:justify-between ll:gap-2">
        <span className="ll:text-[11px] ll:font-semibold ll:text-gray-100">
          {room.organizerCharacter.nick}
        </span>
        <span className="ll:rounded ll:border ll:border-gray-600 ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:text-gray-200">
          {t(`states.partyPresence.${participant.partyPresence}`)}
        </span>
      </div>
      <Button
        disabled={isWithdrawing}
        onClick={() => void withdraw()}
        className="ll:mt-2 ll:w-full ll:border-red-500/60 ll:bg-red-600/10 ll:text-red-300"
      >
        {t("actions.withdraw")}
      </Button>
    </div>
  );
}
