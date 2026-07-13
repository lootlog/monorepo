import type {
  PartyReadyRoomParticipantProjection,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  partyReadyRoomControllerRespondToReadyCheck,
  partyReadyRoomControllerWithdraw,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { usePartyFinderStore } from "@/store/party-finder.store";

type ReadyRoomParticipantStatusProps = {
  room: PartyReadyRoomParticipantProjection;
};

export function ReadyRoomParticipantStatus({
  room,
}: ReadyRoomParticipantStatusProps) {
  const { t } = useTranslation("partyFinder");
  const participant = room.participant;
  const [isUpdating, setIsUpdating] = useState(false);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);

  const respondToReadyCheck = async (ready: boolean) => {
    if (!room.readyCheck) return;
    setIsUpdating(true);
    try {
      const projection = await partyReadyRoomControllerRespondToReadyCheck(
        { notificationId: room.notificationId },
        { roundId: room.readyCheck.roundId, ready },
      );
      mergeProjection(projection as unknown as PartyReadyRoomProjection);
    } finally {
      setIsUpdating(false);
    }
  };

  const withdraw = async () => {
    setIsUpdating(true);
    try {
      const projection = await partyReadyRoomControllerWithdraw({
        notificationId: room.notificationId,
      });
      mergeProjection(projection as unknown as PartyReadyRoomProjection);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="ll:m-2 ll:rounded ll:border ll:border-gray-700 ll:bg-gray-950/60 ll:p-2">
      <div className="ll:flex ll:items-center ll:justify-between ll:gap-2">
        <span className="ll:text-[11px] ll:font-semibold ll:text-gray-100">
          {room.organizerCharacter.nick}
        </span>
        <span className="ll:rounded ll:border ll:border-amber-500/50 ll:px-1.5 ll:py-0.5 ll:text-[9px] ll:uppercase ll:tracking-wide ll:text-amber-300">
          {t(`states.application.${participant.application}`)}
        </span>
      </div>
      <div className="ll:mt-2 ll:grid ll:grid-cols-2 ll:gap-1 ll:text-[10px] ll:text-gray-400">
        <span>{t("labels.readiness")}</span>
        <span className="ll:text-right ll:text-gray-200">
          {t(`states.readiness.${participant.readiness}`)}
        </span>
        <span>{t("labels.partyPresence")}</span>
        <span className="ll:text-right ll:text-gray-200">
          {t(`states.partyPresence.${participant.partyPresence}`)}
        </span>
      </div>
      {participant.application === "ACCEPTED" && room.readyCheck ? (
        <div className="ll:mt-2 ll:grid ll:grid-cols-2 ll:gap-1">
          <Button
            disabled={isUpdating}
            onClick={() => void respondToReadyCheck(true)}
            className="ll:border-green-500/70 ll:bg-green-600/20 ll:text-green-300"
          >
            {t("actions.ready")}
          </Button>
          <Button
            disabled={isUpdating}
            onClick={() => void respondToReadyCheck(false)}
            className="ll:border-amber-500/70 ll:bg-amber-600/20 ll:text-amber-300"
          >
            {t("actions.notReady")}
          </Button>
        </div>
      ) : null}
      {participant.application === "APPLIED" ||
      participant.application === "ACCEPTED" ? (
        <Button
          disabled={isUpdating}
          onClick={() => void withdraw()}
          className="ll:mt-2 ll:w-full ll:border-red-500/60 ll:bg-red-600/10 ll:text-red-300"
        >
          {t("actions.withdraw")}
        </Button>
      ) : null}
    </div>
  );
}
