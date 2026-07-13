import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import {
  Check,
  Loader2,
  MailCheck,
  MailX,
  Plus,
  RotateCcw,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { useReadyRoomInvitationStatusActions } from "@/features/party-finder/hooks/use-ready-room-invitation-status-actions";
import {
  partyReadyRoomControllerAccept,
  partyReadyRoomControllerDecline,
  partyReadyRoomControllerRemove,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { cn } from "@/lib/utils";
import { useFriendsStore } from "@/store/friends.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { inviteCharacterToFriends } from "@/utils/game/character-actions";

type ReadyRoomParticipantItemProps = {
  room: PartyReadyRoomOrganizerProjection;
  participant: PartyReadyRoomParticipant;
};

export function ReadyRoomParticipantItem({
  room,
  participant,
}: ReadyRoomParticipantItemProps) {
  const { t } = useTranslation("partyFinder");
  const [isUpdating, setIsUpdating] = useState(false);
  const [, setReservationClock] = useState(0);
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const isFriend = useFriendsStore((state) =>
    state.isFriend(participant.character.characterId),
  );
  const { inviteParticipants, isInviting } = useReadyRoomInvitations();
  const { annotateInvitation, reconcileInvitation, isUpdatingInvitation } =
    useReadyRoomInvitationStatusActions();
  const invitation = participant.invitation;

  useEffect(() => {
    if (
      invitation.status !== "COMMAND_RESERVED" ||
      !invitation.reservationExpiresAt
    ) {
      return;
    }
    const delay = Math.max(
      0,
      Date.parse(invitation.reservationExpiresAt) - Date.now(),
    );
    const timeout = window.setTimeout(
      () => setReservationClock((value) => value + 1),
      delay,
    );
    return () => window.clearTimeout(timeout);
  }, [invitation.status, invitation.reservationExpiresAt]);

  const mergeResponse = (response: unknown) => {
    mergeProjection(response as PartyReadyRoomProjection);
  };
  const runParticipantAction = async (
    action: "ACCEPT" | "DECLINE" | "REMOVE",
  ) => {
    setIsUpdating(true);
    try {
      const path = { notificationId: room.notificationId };
      const data = {
        participantDiscordId: participant.discordId,
        expectedRevision: room.revision,
      };
      if (action === "ACCEPT") {
        mergeResponse(await partyReadyRoomControllerAccept(path, data));
      } else if (action === "DECLINE") {
        mergeResponse(await partyReadyRoomControllerDecline(path, data));
      } else {
        mergeResponse(await partyReadyRoomControllerRemove(path, data));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const reservationUnknown =
    invitation.status === "COMMAND_RESERVED" &&
    invitation.reservationExpiresAt !== null &&
    Date.parse(invitation.reservationExpiresAt) <= Date.now();
  let invitationLabel = t(`states.invitation.${invitation.status}`);
  if (reservationUnknown) {
    invitationLabel = t("states.invitation.UNKNOWN");
  } else if (invitation.status === "SENT") {
    invitationLabel = t(
      invitation.source === "MANUAL_ANNOTATION"
        ? "states.invitation.SENT_MANUAL"
        : "states.invitation.SENT_LOOTLOG",
    );
  } else if (invitation.status === "FAILED") {
    invitationLabel = t(
      invitation.source === "MANUAL_ANNOTATION"
        ? "states.invitation.FAILED_MANUAL"
        : "states.invitation.FAILED_LOOTLOG",
    );
  }
  const updateInvitationStatus = async (
    outcome: "NOT_MARKED" | "SENT" | "FAILED",
  ) => {
    if (reservationUnknown && invitation.commandId) {
      await reconcileInvitation(
        participant.discordId,
        invitation.commandId,
        outcome,
      );
      return;
    }
    if (outcome !== "NOT_MARKED") {
      await annotateInvitation(participant.discordId, outcome);
    }
  };
  const sameClan =
    participant.character.clan?.id !== undefined &&
    room.organizerCharacter.clan?.id !== undefined &&
    participant.character.clan.id === room.organizerCharacter.clan.id;

  return (
    <Tile
      className={cn(
        "ll:mb-1 ll:flex ll:items-center ll:justify-between ll:border-gray-700 ll:bg-gray-950/50 ll:px-1.5 ll:py-1",
        (sameClan || isFriend) && "ll:border-green-500/70",
      )}
    >
      <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <CharacterTile
          character={{
            id: Number(participant.character.characterId),
            nick: participant.character.nick,
            icon: participant.character.icon,
            lvl: participant.character.lvl,
            prof: participant.character.prof,
            world: room.world,
          }}
          className="ll:max-h-7 ll:scale-75"
        />
        <div className="ll:min-w-0">
          <div className="ll:max-w-28 ll:truncate ll:text-[11px] ll:font-semibold ll:text-gray-100">
            {participant.character.nick} ({participant.character.lvl}
            {participant.character.prof})
          </div>
          <div className="ll:text-[9px] ll:text-gray-500">
            {t(`states.application.${participant.application}`)} ·{" "}
            {invitationLabel}
          </div>
        </div>
      </div>
      <div className="ll:flex ll:items-center ll:gap-0.5">
        {!isFriend && !sameClan ? (
          <Button
            className="ll:p-0"
            title={t("actions.addFriend")}
            onClick={() => inviteCharacterToFriends(participant.character.nick)}
          >
            <UserPlus size={17} className="ll:text-blue-400" />
          </Button>
        ) : null}
        {participant.application === "APPLIED" ? (
          <>
            <Button
              className="ll:p-0"
              title={t("actions.accept")}
              disabled={isUpdating}
              onClick={() => void runParticipantAction("ACCEPT")}
            >
              <Check size={17} className="ll:text-green-400" />
            </Button>
            <Button
              className="ll:p-0"
              title={t("actions.decline")}
              disabled={isUpdating}
              onClick={() => void runParticipantAction("DECLINE")}
            >
              <X size={17} className="ll:text-red-400" />
            </Button>
          </>
        ) : null}
        {participant.application === "ACCEPTED" ? (
          <>
            {invitation.status === "NOT_MARKED" || reservationUnknown ? (
              <>
                <Button
                  className="ll:p-0"
                  title={t("actions.markInvitationSent")}
                  disabled={isUpdatingInvitation}
                  onClick={() => void updateInvitationStatus("SENT")}
                >
                  <MailCheck size={16} className="ll:text-blue-300" />
                </Button>
                <Button
                  className="ll:p-0"
                  title={t("actions.markInvitationFailed")}
                  disabled={isUpdatingInvitation}
                  onClick={() => void updateInvitationStatus("FAILED")}
                >
                  <MailX size={16} className="ll:text-red-300" />
                </Button>
              </>
            ) : null}
            {reservationUnknown ? (
              <Button
                className="ll:p-0"
                title={t("actions.clearInvitationStatus")}
                disabled={isUpdatingInvitation}
                onClick={() => void updateInvitationStatus("NOT_MARKED")}
              >
                <RotateCcw size={15} className="ll:text-gray-300" />
              </Button>
            ) : null}
            {participant.partyPresence === "OUTSIDE" ? (
              <Button
                className="ll:p-0"
                title={t("actions.invite")}
                disabled={
                  isInviting ||
                  (!reservationUnknown &&
                    invitation.status === "COMMAND_RESERVED")
                }
                onClick={() => void inviteParticipants([participant.discordId])}
              >
                {isInviting ? (
                  <Loader2
                    size={17}
                    className="ll:animate-spin ll:text-amber-300"
                  />
                ) : (
                  <Plus size={17} className="ll:text-green-400" />
                )}
              </Button>
            ) : null}
            <Button
              className="ll:p-0"
              title={t("actions.remove")}
              disabled={isUpdating}
              onClick={() => void runParticipantAction("REMOVE")}
            >
              <UserMinus size={17} className="ll:text-red-400" />
            </Button>
          </>
        ) : null}
      </div>
    </Tile>
  );
}
