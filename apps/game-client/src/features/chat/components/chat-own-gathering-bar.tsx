import { ChatGatheringCardView } from "./chat-gathering-card-view";
import { ChatGatheringInviteButton } from "./chat-gathering-invite-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { GatheringPartyCounter } from "@/components/common/gathering-party-counter";
import { Settings2, Ban, Check, LoaderCircle, TimerReset } from "lucide-react";
import { ChatGatheringMenu } from "./chat-gathering-menu";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  PartyReadyRoomProjection,
  PartyGatheringSummary,
} from "@lootlog/schema/party-ready-room";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { Button } from "@/components/ui/button";
import { useGatheringPartyState } from "@/components/common/use-gathering-party-state";
import { useReadyRoomMinutesLeft } from "@/components/common/use-ready-room-minutes-left";
import { ReadyRoomMinutesLeft } from "@/components/common/ready-room-minutes-left";
import { IconButton } from "@/components/ui/icon-button";
import { useExtendPartyGathering } from "@/hooks/api/use-extend-party-gathering";
import { getRoomOrganizer } from "@/features/chat/party-gathering-organizer";

// The organizer is offered to extend the gathering in its last minutes.
const EXTEND_OFFER_MINUTES = 2;

function getLatestDetails(
  room: PartyReadyRoomProjection,
  summary: PartyGatheringSummary | undefined,
) {
  return summary && (summary.revision ?? 0) > room.revision ? summary : room;
}

export function ChatOwnGatheringBar({
  room,
  organizer,
  summary,
  stale,
}: {
  room: PartyReadyRoomProjection;
  /** Shows organizer controls; otherwise the current character's application. */
  organizer: boolean;
  summary?: PartyGatheringSummary;
  stale?: boolean;
}) {
  const { t } = useTranslation("chat");
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const cancellation = useCancelPartyGathering();
  const extension = useExtendPartyGathering();
  const withdrawal = useReadyRoomWithdrawal(room);
  const [inviteFailed, setInviteFailed] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);

  const latest = getLatestDetails(room, summary);
  const partyState = latest.partyState ?? summary?.partyState;
  const minutesLeft = useReadyRoomMinutesLeft(latest.expiresAt);
  const { observation, isStale } = useGatheringPartyState(partyState, stale);

  const actionLabel = t(
    cancellation.isPending ? "gatherings.cancelling" : "gatherings.cancel",
  );

  const counts = { partyState, stale };

  const participationButton = organizer ? (
    <ChatGatheringInviteButton onErrorChange={setInviteFailed} />
  ) : (
    <ChatGatheringJoinButton
      pending={withdrawal.isWithdrawing}
      disabled={!withdrawal.participant}
      status={
        !isStale &&
        observation?.members.some(
          (member) =>
            member.characterId ===
            withdrawal.participant?.character.characterId,
        )
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
            <GatheringPartyCounter {...counts} />
            <ReadyRoomMinutesLeft expiresAt={latest.expiresAt} />
          </div>
          {minutesLeft <= EXTEND_OFFER_MINUTES ? (
            <IconButton
              label={t("gatherings.extendLabel")}
              disabled={extension.isPending}
              onClick={() => extension.mutate()}
            >
              <TimerReset aria-hidden className="ll:text-amber-200" />
            </IconButton>
          ) : null}
          {participationButton}
          <ChatGatheringMenu side="top">
            <Button
              size="xs"
              variant="menu"
              className="ll:w-full ll:justify-start ll:gap-2"
              onClick={() => openAndFocus("party-finder")}
            >
              <Settings2 size={16} aria-hidden />
              {t("gatherings.manage")}
            </Button>
            <Button
              size="xs"
              variant="menu"
              className="ll:mt-1 ll:w-full ll:justify-start ll:gap-2"
              title={t("gatherings.extendLabel")}
              disabled={extension.isPending}
              onClick={() => extension.mutate()}
            >
              <TimerReset size={16} aria-hidden />
              {t("gatherings.extend")}
            </Button>
            <Button
              size="xs"
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
          organizer={getRoomOrganizer(room)}
          organizerDiscordId={room.organizerDiscordId}
          organizerMapName={latest.organizerMapName}
          expiresAt={latest.expiresAt}
          guildIds={room.guildIds}
          counters=<GatheringPartyCounter {...counts} />
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
