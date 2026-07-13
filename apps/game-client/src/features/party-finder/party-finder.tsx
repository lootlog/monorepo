import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import {
  selectAcceptedReadyRoomId,
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ReadyRoomParticipantsList } from "@/features/party-finder/components/ready-room-participants-list";
import { ReadyRoomParticipantStatus } from "@/features/party-finder/components/ready-room-participant-status";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { useClosePartyGathering } from "@/hooks/api/use-close-party-gathering";
import type {
  PartyReadyRoomParticipantProjection,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { usePartyReadyRoomControllerStartReadyCheck } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import { ReadyRoomSelector } from "@/features/party-finder/components/ready-room-selector";

export const PartyFinder = () => {
  const { t } = useTranslation("partyFinder");
  const open = useWindowsStore((state) => state["party-finder"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const projections = usePartyFinderStore((state) => state.projections);
  const selectedRoomId = usePartyFinderStore((state) => state.selectedRoomId);
  const selectRoom = usePartyFinderStore((state) => state.selectRoom);
  const ownedReadyRoom = usePartyFinderStore(selectOwnedReadyRoom);
  const acceptedReadyRoomId = usePartyFinderStore(selectAcceptedReadyRoomId);
  const activeSelectedRoom = selectedRoomId
    ? projections[selectedRoomId]
    : undefined;
  const firstActiveRoom = Object.values(projections).find(
    (projection) => projection.status === "ACTIVE",
  );
  const readyRoom =
    ownedReadyRoom ??
    (acceptedReadyRoomId ? projections[acceptedReadyRoomId] : undefined) ??
    (activeSelectedRoom?.status === "ACTIVE"
      ? activeSelectedRoom
      : undefined) ??
    firstActiveRoom ??
    null;
  const participantRooms = Object.values(projections).filter(
    (projection): projection is PartyReadyRoomParticipantProjection =>
      projection.viewer === "PARTICIPANT" && projection.status === "ACTIVE",
  );
  const partyMembers = usePartyStore((s) => s.members);
  const { mutate: cancelPartyGathering, isPending: isCancelling } =
    useCancelPartyGathering();
  const { mutate: closePartyGathering, isPending: isClosing } =
    useClosePartyGathering();
  const { inviteParticipants, isInviting } = useReadyRoomInvitations();
  const mergeProjection = usePartyFinderStore((state) => state.mergeProjection);
  const startReadyCheck = usePartyReadyRoomControllerStartReadyCheck();
  const isOwner = readyRoom?.viewer === "ORGANIZER";
  const invitableParticipantDiscordIds =
    readyRoom?.viewer === "ORGANIZER"
      ? Object.values(readyRoom.participants)
          .filter(
            (participant) =>
              participant.application === "ACCEPTED" &&
              participant.partyPresence === "OUTSIDE" &&
              (participant.invitation.status !== "COMMAND_RESERVED" ||
                participant.invitation.reservationExpiresAt === null ||
                Date.parse(participant.invitation.reservationExpiresAt) <=
                  Date.now()),
          )
          .map(({ discordId }) => discordId)
      : [];

  if (!readyRoom) return null;

  return (
    <AnimatedWindow isOpen={open} windowKey="party-finder">
      <DraggableWindow
        id="party-finder"
        title={t("window.title")}
        onClose={() => setOpen("party-finder", false)}
        variant="default"
        minHeight={108}
        minWidth={242}
      >
        <div className="ll:flex ll:flex-col ll:h-full">
          <div className="ll:shrink-0 ll:flex ll:items-center ll:justify-center ll:gap-1 ll:py-1.5 ll:border-b ll:border-gray-700">
            <span className="ll:text-[11px] ll:text-gray-300">
              {t("header.party")}
            </span>
            <span
              className={`ll:text-[11px] ll:font-semibold ${partyMembers.length >= 10 ? "ll:text-red-400" : "ll:text-green-400"}`}
            >
              {partyMembers.length}/10
            </span>
          </div>
          {readyRoom.viewer === "PARTICIPANT" && participantRooms.length > 1 ? (
            <ReadyRoomSelector
              rooms={participantRooms}
              selectedRoomId={readyRoom.notificationId}
              onSelect={selectRoom}
            />
          ) : null}
          <ScrollArea className="ll:flex-1">
            {readyRoom.viewer === "ORGANIZER" ? (
              <ReadyRoomParticipantsList room={readyRoom} />
            ) : (
              <ReadyRoomParticipantStatus room={readyRoom} />
            )}
          </ScrollArea>
          {isOwner ? (
            <div className="ll:shrink-0 ll:p-2 ll:border-t ll:border-gray-700 ll:flex ll:flex-col ll:gap-1.5">
              {invitableParticipantDiscordIds.length > 0 ? (
                <Button
                  onClick={() =>
                    void inviteParticipants(invitableParticipantDiscordIds)
                  }
                  disabled={isInviting}
                  className="ll:w-full ll:border-green-500 ll:text-green-400 ll:hover:bg-green-600/20"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="ll:w-3 ll:h-3 ll:animate-spin ll:mr-1" />
                      {t("actions.inviting")}
                    </>
                  ) : (
                    t("actions.inviteAll")
                  )}
                </Button>
              ) : null}
              {readyRoom.viewer === "ORGANIZER" &&
              Object.values(readyRoom.participants).some(
                ({ application }) => application === "ACCEPTED",
              ) ? (
                <Button
                  disabled={startReadyCheck.isPending}
                  onClick={() =>
                    startReadyCheck.mutate(
                      {
                        pathParams: {
                          notificationId: readyRoom.notificationId,
                        },
                        data: { expectedRevision: readyRoom.revision },
                      },
                      {
                        onSuccess: (projection) =>
                          mergeProjection(
                            projection as unknown as PartyReadyRoomProjection,
                          ),
                      },
                    )
                  }
                  className="ll:w-full ll:border-amber-500/70 ll:bg-amber-600/15 ll:text-amber-300"
                >
                  {startReadyCheck.isPending
                    ? t("actions.startingReadyCheck")
                    : t("actions.startReadyCheck")}
                </Button>
              ) : null}
              <Button
                onClick={() => closePartyGathering()}
                disabled={isClosing || isCancelling}
                className="ll:w-full ll:border-emerald-500/70 ll:bg-emerald-600/20 ll:text-emerald-300 ll:hover:bg-emerald-600/30"
              >
                {isClosing
                  ? t("actions.ending")
                  : t("actions.closePartyGathering")}
              </Button>
              <Button
                onClick={() => cancelPartyGathering()}
                disabled={isCancelling || isClosing}
                className="ll:w-full ll:border-red-500 ll:bg-red-600/20 ll:text-red-300 ll:hover:bg-red-600/40"
              >
                {isCancelling
                  ? t("actions.ending")
                  : t("actions.cancelPartyGathering")}
              </Button>
            </div>
          ) : null}
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
