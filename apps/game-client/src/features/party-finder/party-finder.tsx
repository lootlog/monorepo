import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import {
  selectReadyRoomForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { ReadyRoomParticipantsList } from "@/features/party-finder/components/ready-room-participants-list";
import { ReadyRoomParticipantStatus } from "@/features/party-finder/components/ready-room-participant-status";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";

export const PartyFinder = () => {
  const { t } = useTranslation("partyFinder");
  const open = useWindowsStore((state) => state["party-finder"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const readyRoom = usePartyFinderStore((state) =>
    selectReadyRoomForCharacter(state, currentCharacterIdentity),
  );
  const partyMembers = usePartyStore((s) => s.members);
  const { mutate: cancelPartyGathering, isPending: isCancelling } =
    useCancelPartyGathering();
  const { inviteParticipants, canInviteParticipants } =
    useReadyRoomInvitations();
  const isOrganizerView =
    readyRoom?.viewer === "ORGANIZER" &&
    currentCharacterIdentity?.accountId ===
      readyRoom.organizerCharacter.accountId &&
    currentCharacterIdentity.characterId ===
      readyRoom.organizerCharacter.characterId;
  const invitableParticipantIds =
    isOrganizerView && readyRoom.viewer === "ORGANIZER"
      ? Object.values(readyRoom.participants)
          .filter((participant) => participant.partyPresence === "OUTSIDE")
          .map(({ participantId }) => participantId)
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
          <ScrollArea className="ll:flex-1">
            {isOrganizerView && readyRoom.viewer === "ORGANIZER" ? (
              <ReadyRoomParticipantsList room={readyRoom} />
            ) : (
              <ReadyRoomParticipantStatus room={readyRoom} />
            )}
          </ScrollArea>
          {isOrganizerView ? (
            <div className="ll:shrink-0 ll:p-2 ll:border-t ll:border-gray-700 ll:flex ll:flex-col ll:gap-1.5">
              <Button
                onClick={() => {
                  void inviteParticipants().catch((error: unknown) => {
                    console.warn("Failed to resolve party invitations", error);
                  });
                }}
                disabled={
                  invitableParticipantIds.length === 0 ||
                  !canInviteParticipants()
                }
                className="ll:w-full ll:border-green-500 ll:text-green-400 ll:hover:bg-green-600/20"
              >
                {t("actions.inviteAll")}
              </Button>
              <Button
                onClick={() => cancelPartyGathering()}
                disabled={isCancelling}
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
