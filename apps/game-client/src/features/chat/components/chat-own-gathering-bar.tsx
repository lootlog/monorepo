import { ChatGatheringInviteButton } from "./chat-gathering-invite-button";
import {
  ChatGatheringDetails,
  hasChatGatheringDetails,
} from "./chat-gathering-details";
import {
  Settings2,
  X,
  LogOut,
  LoaderCircle,
  Users,
  UserCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useWindowsStore } from "@/store/windows.store";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { useReadyRoomWithdrawal } from "@/features/party-finder/hooks/use-ready-room-withdrawal";
import { useCancelPartyGathering } from "@/hooks/api/use-cancel-party-gathering";
import { Button } from "@/components/ui/button";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

export function ChatOwnGatheringBar({
  room,
}: {
  room: PartyReadyRoomProjection;
}) {
  const { t } = useTranslation("chat");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const cancellation = useCancelPartyGathering();
  const withdrawal = useReadyRoomWithdrawal(room);
  const [inviteFailed, setInviteFailed] = useState(false);
  const [withdrawFailed, setWithdrawFailed] = useState(false);
  const hasDetails = hasChatGatheringDetails(room);
  const organizer = room.viewer === "ORGANIZER";
  const pending = cancellation.isPending || withdrawal.isWithdrawing;
  const actionLabel = organizer
    ? t(pending ? "gatherings.cancelling" : "gatherings.cancel")
    : t(pending ? "gatherings.withdrawing" : "gatherings.withdraw");
  const participants = Object.values(room.participants);
  const inParty = participants.filter(
    (participant) => participant.partyPresence === "IN_PARTY",
  ).length;
  const counters = [
    {
      id: "applicants",
      Icon: Users,
      value: participants.length,
      label: t("gatherings.applicantCount", { count: participants.length }),
    },
    {
      id: "inParty",
      Icon: UserCheck,
      value: inParty,
      label: t("gatherings.inPartyCount", {
        count: inParty,
      }),
    },
  ];
  const inviteButton = organizer ? (
    <ChatGatheringInviteButton onErrorChange={setInviteFailed} />
  ) : null;
  return (
    <>
      <div className="ll:flex ll:flex-col ll:gap-0.5">
        <div
          className={`ll:flex ll:h-4 ll:items-start ll:gap-1 ${hasDetails ? "ll:mb-1" : ""}`}
        >
          <span className="ll:shrink-0 ll:whitespace-nowrap ll:relative ll:-top-px ll:text-[11px] ll:font-semibold">
            {t("gatherings.title")}
          </span>
          {organizer && (
            <div className="ll:ml-1 ll:flex ll:items-center ll:gap-1.5">
              {counters.map(({ id, Icon, value, label }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      role="img"
                      aria-label={label}
                      className="ll:flex ll:items-center ll:gap-0.5 ll:text-[10px] ll:tabular-nums ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
                    >
                      <Icon size={12} aria-hidden="true" />
                      <span aria-hidden="true">{value}</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}
          <div className="ll:ml-auto ll:-mt-1 ll:flex ll:shrink-0 ll:items-center ll:gap-0">
            {!hasDetails && inviteButton}
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
                  variant="ghost"
                  className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6`}
                  aria-label={actionLabel}
                  aria-busy={pending}
                  disabled={pending || (!organizer && !withdrawal.participant)}
                  onClick={() => {
                    if (organizer) cancellation.mutate();
                    else {
                      setWithdrawFailed(false);
                      void withdrawal
                        .withdraw()
                        ?.catch(() => setWithdrawFailed(true));
                    }
                  }}
                >
                  {pending ? (
                    <LoaderCircle size={14} aria-hidden="true" />
                  ) : organizer ? (
                    <X size={14} aria-hidden="true" />
                  ) : (
                    <LogOut size={14} aria-hidden="true" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">{actionLabel}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <ChatGatheringDetails
          {...room}
          action={hasDetails ? inviteButton : undefined}
        />
        {!organizer && (
          <div className="ll:text-[10px] ll:text-gray-300 ll:[overflow-wrap:anywhere]">
            {t(
              withdrawal.participant?.partyPresence === "IN_PARTY"
                ? "gatherings.inParty"
                : "gatherings.applied",
            )}
          </div>
        )}
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
