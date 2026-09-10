import { ChatGatheringCardView } from "./chat-gathering-card-view";
import { ChatGatheringInviteButton } from "./chat-gathering-invite-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import { Settings2, Ban, Check, LoaderCircle } from "lucide-react";
import { ChatGatheringMenu } from "./chat-gathering-menu";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { Button } from "@/components/ui/button";

export function ChatOwnGatheringBar({
  room,
  summary,
}: {
  room: PartyReadyRoomProjection;
  summary?: ActivePartyGatheringSummary;
}) {
  const { t } = useTranslation("chat");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const cancellation = useCancelPartyGathering();
  const withdrawal = useReadyRoomWithdrawal(room);
  const [inviteFailed, setInviteFailed] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);
  const organizer = room.viewer === "ORGANIZER";

  const actionLabel = t(
    cancellation.isPending ? "gatherings.cancelling" : "gatherings.cancel",
  );

  const counts = {
    partyMemberCount: room.partyMemberCount ?? summary?.partyMemberCount,
  };

  const participationButton = organizer ? (
    <ChatGatheringInviteButton onErrorChange={setInviteFailed} />
  ) : (
    <ChatGatheringJoinButton
      pending={withdrawal.isWithdrawing}
      disabled={!withdrawal.participant}
      status={
        withdrawal.participant?.partyPresence === "IN_PARTY"
          ? "inParty"
          : "applied"
      }
      onClick={() => {
        setWithdrawFailed(false);
        void withdrawal.withdraw()?.catch(() => setWithdrawFailed(true));
      }}
    />
  );

  const participationAction = (
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
      {withdrawal.isWithdrawing ? (
        <LoaderCircle size={16} aria-hidden />
      ) : (
        <Check size={16} aria-hidden />
      )}
    </div>
  );

  return (
    <>
      {organizer ? (
        <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1.5">
          <div className="ll:flex ll:min-w-0 ll:flex-1 ll:items-center ll:gap-1.5">
            <span
              className="ll:min-w-0 ll:truncate ll:text-[12px] ll:font-semibold"
              title={room.npc?.name}
            >
              {room.npc?.name ?? t("gatherings.ownTitle")}
            </span>
            <ChatGatheringCounters {...counts} />
          </div>
          {participationButton}
          <ChatGatheringMenu side="top">
            <Button
              variant="menu"
              className="ll:w-full ll:justify-start ll:gap-2"
              onClick={() => setOpen("party-finder", true)}
            >
              <Settings2 size={16} aria-hidden />
              {t("gatherings.manage")}
            </Button>
            <Button
              variant="menu"
              className="ll:mt-1 ll:w-full ll:justify-start ll:gap-2 ll:text-red-400"
              aria-label={actionLabel}
              aria-busy={cancellation.isPending}
              disabled={cancellation.isPending}
              onClick={() => cancellation.mutate()}
            >
              <Ban size={14} aria-hidden />
              {actionLabel}
            </Button>
          </ChatGatheringMenu>
        </div>
      ) : (
        <ChatGatheringCardView
          joined
          organizerDiscordId={room.organizerDiscordId}
          guildIds={room.guildIds}
          counters=<ChatGatheringCounters {...counts} />
          details={{ ...room, action: participationAction }}
          control={participationButton}
        />
      )}
      {inviteFailed && (
        <p role="alert" className="ll:m-0 ll:text-amber-200">
          {t("gatherings.inviteFailed")}
        </p>
      )}
      {cancellation.isError && (
        <p role="alert" className="ll:m-0 ll:text-amber-200">
          {t("gatherings.cancelFailed")}
        </p>
      )}
      {withdrawFailed && (
        <p role="alert" className="ll:m-0 ll:text-amber-200">
          {t("gatherings.withdrawFailed")}
        </p>
      )}
    </>
  );
}
