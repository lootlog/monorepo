import { ChatGatheringCardView } from "./chat-gathering-card-view";
import { ChatGatheringInviteButton } from "./chat-gathering-invite-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { GatheringPartyCounter } from "@/components/common/gathering-party-counter";
import { GatheringRoster } from "@/components/common/gathering-roster";
import { Settings2, Ban, Check, LoaderCircle } from "lucide-react";
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

function getLatestRoster(
  room: PartyReadyRoomProjection,
  summary: PartyGatheringSummary | undefined,
) {
  const latestDetails =
    summary && (summary.revision ?? 0) > room.revision ? summary : room;

  return {
    partyState: latestDetails.partyState ?? summary?.partyState,
    volunteers: latestDetails.volunteers ?? summary?.volunteers,
  };
}

export function ChatOwnGatheringBar({
  room,
  summary,
  stale,
}: {
  room: PartyReadyRoomProjection;
  summary?: PartyGatheringSummary;
  stale?: boolean;
}) {
  const { t } = useTranslation("chat");
  const openAndFocus = useWindowsStore((state) => state.openAndFocus);
  const cancellation = useCancelPartyGathering();
  const withdrawal = useReadyRoomWithdrawal(room);
  const [inviteFailed, setInviteFailed] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);
  const organizer = room.viewer === "ORGANIZER";

  const { partyState, volunteers } = getLatestRoster(room, summary);
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
          </div>
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
          counters=<GatheringPartyCounter {...counts} />
          details={{ ...room, action: participationAction }}
          control={participationButton}
          roster=<GatheringRoster
            volunteers={volunteers}
            partyState={partyState}
            stale={stale}
          />
        />
      )}
      {organizer && (
        <div className="ll:max-h-48 ll:overflow-y-auto">
          <GatheringRoster
            volunteers={volunteers}
            partyState={partyState}
            stale={stale}
          />
        </div>
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
