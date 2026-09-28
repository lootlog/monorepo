import { useState } from "react";
import { toast } from "sonner";
import { ConfirmPopover } from "@/components/confirm-popover";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import {
  useOwnedReadyRoom,
  useReadyRoomsSynchronized,
} from "@/features/party-finder/hooks/use-ready-rooms";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { ReadyRoomParticipantsList } from "@/features/party-finder/components/ready-room-participants-list";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { selectParticipantsOutsideParty } from "@/features/party-finder/ready-room-cache";
import { ReadyRoomExpiry } from "@/features/party-finder/components/ready-room-expiry";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { GatheringRoster } from "@/components/common/gathering-roster";
import { GatheringPartyCounter } from "@/components/common/gathering-party-counter";

export const PartyFinder = () => {
  const { t } = useTranslation(["partyFinder", "chat"]);
  const open = useWindowsStore((state) => state["party-finder"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const readyRoom = useOwnedReadyRoom();
  const synchronized = useReadyRoomsSynchronized();

  const { mutate: cancelPartyGathering, isPending: isCancelling } =
    useCancelPartyGathering();

  const { inviteParticipants, canInviteParticipants } =
    useReadyRoomInvitations();

  const isOrganizerCharacter =
    readyRoom !== null &&
    currentCharacterIdentity?.accountId ===
      readyRoom.organizerCharacter.accountId &&
    currentCharacterIdentity.characterId ===
      readyRoom.organizerCharacter.characterId;

  if (!readyRoom) return null;

  const waitingCount = selectParticipantsOutsideParty(readyRoom).length;

  const volunteers =
    readyRoom.volunteers ??
    Object.values(readyRoom.participants).map((participant) => ({
      ...participant.character,
      partyPresence: participant.partyPresence,
    }));

  return (
    <DraggableWindow
      isOpen={open}
      id="party-finder"
      title={t("window.title")}
      onClose={() => setOpen("party-finder", false)}
      variant="default"
      contentClassName="ll:-mx-1 ll:-mb-1"
      minHeight={108}
      minWidth={242}
    >
      <div className="ll:flex ll:flex-col ll:h-full">
        <div className="ll:shrink-0 ll:flex ll:items-center ll:justify-between ll:gap-2 ll:px-[6px] ll:py-1 ll:text-[11px] ll:border-b ll:border-white/10">
          {isOrganizerCharacter ? (
            <span className="ll:flex ll:items-center ll:gap-1">
              <span className="ll:text-white/65">{t("header.party")}</span>
              <GatheringPartyCounter
                partyState={readyRoom.partyState}
                stale={!synchronized}
              />
            </span>
          ) : (
            <span className="ll:min-w-0 ll:truncate ll:font-semibold ll:text-white">
              {readyRoom.organizerCharacter.nick} · {readyRoom.world}
            </span>
          )}
          <ReadyRoomExpiry expiresAt={readyRoom.expiresAt} />
        </div>
        <ScrollArea className="ll:flex-1">
          <GatheringRoster
            volunteers={volunteers}
            partyState={readyRoom.partyState}
            stale={!synchronized}
            volunteerContent=<ReadyRoomParticipantsList
              room={readyRoom}
              stale={!synchronized}
            />
          />
        </ScrollArea>
        <div className="ll:shrink-0 ll:flex ll:gap-1 ll:px-[6px] ll:py-1.5 ll:border-t ll:border-white/10">
          {isOrganizerCharacter ? (
            <Button
              size="xs"
              className="ll:min-w-0 ll:flex-1"
              onClick={() => {
                void inviteParticipants().catch(() => {
                  toast.error(t("gatherings.inviteFailed", { ns: "chat" }));
                });
              }}
              disabled={waitingCount === 0 || !canInviteParticipants()}
            >
              {t("actions.inviteAll", { count: waitingCount })}
            </Button>
          ) : null}
          <ConfirmPopover
            open={cancelConfirmOpen}
            onOpenChange={setCancelConfirmOpen}
            title={t("cancelConfirm.title")}
            description={t("cancelConfirm.description")}
            confirmLabel={t("cancelConfirm.confirm")}
            pending={isCancelling}
            onConfirm={() =>
              cancelPartyGathering(undefined, {
                onSettled: () => setCancelConfirmOpen(false),
              })
            }
            trigger={
              <Button
                variant="destructive"
                size="xs"
                className={isOrganizerCharacter ? undefined : "ll:flex-1"}
                disabled={isCancelling}
              >
                {isCancelling
                  ? t("actions.ending")
                  : t("actions.cancelPartyGathering")}
              </Button>
            }
          />
        </div>
      </div>
    </DraggableWindow>
  );
};
