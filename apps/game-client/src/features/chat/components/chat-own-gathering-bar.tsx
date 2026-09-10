import { ChatGatheringInviteButton } from "./chat-gathering-invite-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import {
  ChatGatheringDetails,
  hasChatGatheringDetails,
} from "./chat-gathering-details";
import { Settings2, X, LoaderCircle } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { Button } from "@/components/ui/button";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

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
  const hasDetails = hasChatGatheringDetails(room);
  const organizer = room.viewer === "ORGANIZER";
  const actionLabel = t(
    cancellation.isPending ? "gatherings.cancelling" : "gatherings.cancel",
  );
  const participants = Object.values(room.participants).filter(
    ({ character }) =>
      character.accountId !== room.organizerCharacter.accountId ||
      character.characterId !== room.organizerCharacter.characterId,
  );
  const inParty = participants.filter(
    (participant) => participant.partyPresence === "IN_PARTY",
  ).length;
  const counts = organizer
    ? { applicantCount: participants.length, inPartyCount: inParty }
    : summary;
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
  return (
    <>
      <div className="ll:flex ll:flex-col ll:gap-0.5">
        <div
          className={`ll:flex ll:flex-wrap ll:gap-1 ${hasDetails ? "ll:min-h-5 ll:items-start ll:mb-1" : "ll:min-h-6 ll:items-center"}`}
        >
          <span
            className={`ll:min-w-0 ll:[overflow-wrap:anywhere] ll:text-[11px] ll:font-semibold ${hasDetails ? "ll:relative ll:-top-px" : ""}`}
          >
            {t("gatherings.titleWithOrganizer", {
              organizer: room.organizerCharacter.nick,
            })}
          </span>
          <ChatGatheringCounters {...counts} />
          <div
            className={`ll:ml-auto ll:flex ll:shrink-0 ll:items-center ll:gap-0 ${hasDetails ? "ll:-mt-1" : ""}`}
          >
            {!hasDetails && participationButton}
            {organizer && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6`}
                      aria-label={t("gatherings.manage")}
                      onClick={() => setOpen("party-finder", true)}
                    >
                      <Settings2 size={14} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t("gatherings.manage")}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6`}
                      aria-label={actionLabel}
                      aria-busy={cancellation.isPending}
                      disabled={cancellation.isPending}
                      onClick={() => cancellation.mutate()}
                    >
                      {cancellation.isPending ? (
                        <LoaderCircle size={14} aria-hidden="true" />
                      ) : (
                        <X size={14} aria-hidden="true" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{actionLabel}</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>
        <ChatGatheringDetails
          {...room}
          action={hasDetails ? participationButton : undefined}
        />
      </div>
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
