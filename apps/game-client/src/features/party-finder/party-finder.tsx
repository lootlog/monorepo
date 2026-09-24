import { useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";
import { ConfirmPopover } from "@/components/confirm-popover";
import { ConnectionStatusStrip } from "@/components/connection-status-strip";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import { useReadyRooms } from "@/features/party-finder/hooks/use-ready-rooms";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import { usePartyStore } from "@/store/party.store";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "react-i18next";
import { ReadyRoomParticipantsList } from "@/features/party-finder/components/ready-room-participants-list";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";

const PARTY_SIZE_LIMIT = 10;

export const PartyFinder = () => {
  const { t } = useTranslation(["partyFinder", "chat"]);
  const open = useWindowsStore((state) => state["party-finder"].open);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const currentCharacterIdentity = getCurrentReadyRoomCharacterIdentity();
  const readyRoomsQuery = useReadyRooms(selectOwnedReadyRoom);
  const readyRoom = readyRoomsQuery.data ?? null;
  const partyMembers = usePartyStore((s) => s.members);
  const partyFull = partyMembers.length >= PARTY_SIZE_LIMIT;

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

  const hasInvitableParticipants =
    isOrganizerCharacter &&
    Object.values(readyRoom.participants).some(
      (participant) => participant.partyPresence === "OUTSIDE",
    );

  if (!readyRoom) return null;

  return (
    <DraggableWindow
      isOpen={open}
      id="party-finder"
      title={t("window.title")}
      onClose={() => setOpen("party-finder", false)}
      variant="default"
      minHeight={108}
      minWidth={242}
    >
      <div className="ll:flex ll:flex-col ll:h-full">
        {isOrganizerCharacter ? (
          <div className="ll:shrink-0 ll:flex ll:items-center ll:justify-center ll:gap-1 ll:py-1.5 ll:border-b ll:border-gray-700">
            <span className="ll:text-[11px] ll:text-gray-300">
              {t("header.party")}
            </span>
            <span
              className={cn(
                "ll:inline-flex ll:items-center ll:gap-1 ll:text-[11px] ll:font-semibold ll:tabular-nums",
                partyFull ? "ll:text-red-400" : "ll:text-green-400",
              )}
            >
              {partyFull ? (
                <Lock aria-hidden="true" className="ll:size-3" />
              ) : null}
              {partyMembers.length}/{PARTY_SIZE_LIMIT}
              {partyFull ? <span>{t("header.partyFull")}</span> : null}
            </span>
          </div>
        ) : (
          <div className="ll:p-2 ll:text-xs">
            {readyRoom.organizerCharacter.nick} · {readyRoom.world}
          </div>
        )}
        <ConnectionStatusStrip
          error={readyRoomsQuery.isError}
          errorLabel={t("states.refreshError")}
          hasData
          refreshing={readyRoomsQuery.isFetching}
          refreshingLabel={t("states.refreshing")}
          onRetry={() => void readyRoomsQuery.refetch()}
        />
        <ScrollArea className="ll:flex-1">
          <ReadyRoomParticipantsList room={readyRoom} />
        </ScrollArea>
        <div className="ll:shrink-0 ll:p-2 ll:border-t ll:border-gray-700 ll:flex ll:flex-col ll:gap-1.5">
          {isOrganizerCharacter ? (
            <Button
              size="xs"
              className="ll:w-full"
              onClick={() => {
                void inviteParticipants().catch(() => {
                  toast.error(t("gatherings.inviteFailed", { ns: "chat" }));
                });
              }}
              disabled={!hasInvitableParticipants || !canInviteParticipants()}
            >
              {t("actions.inviteAll")}
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
                className="ll:w-full"
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
