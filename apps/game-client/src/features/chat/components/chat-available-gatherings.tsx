import {
  ChatGatheringDetails,
  hasChatGatheringDetails,
} from "./chat-gathering-details";
import { ChatOwnGatheringBar } from "./chat-own-gathering-bar";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import { ChatGatheringHideButton } from "./chat-gathering-hide-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

type Props = {
  candidates: ActivePartyGatheringSummary[];
  target: ActivePartyGatheringSummary | null;
  room: PartyReadyRoomProjection | null;
  roomSummary?: ActivePartyGatheringSummary;
  locked: boolean;
  pending: boolean;
  stale: boolean;
  onApply: (candidate: ActivePartyGatheringSummary) => void;
  onHide: (candidate: ActivePartyGatheringSummary) => void;
  onShowLatest: () => void;
};

export function ChatAvailableGatherings({
  candidates,
  target,
  room,
  roomSummary,
  locked,
  pending,
  stale,
  onApply,
  onHide,
  onShowLatest,
}: Props) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState(false);
  if (!target && !room)
    return candidates.length > 0 ? (
      <Button
        variant="ghost"
        className={CHAT_GATHERING_ACTION_CLASS}
        onClick={onShowLatest}
      >
        {t("gatherings.showLatest")}
      </Button>
    ) : null;
  const hasDetails = target ? hasChatGatheringDetails(target) : false;
  const otherCandidates = candidates.filter(
    (candidate) =>
      candidate.notificationId !==
      (room?.notificationId ?? target?.notificationId),
  );
  const joinButton = target && (
    <ChatGatheringJoinButton
      pending={pending}
      disabled={stale}
      featured
      onClick={() => onApply(target)}
    />
  );
  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-0.5">
      {room ? (
        <ChatOwnGatheringBar
          key={room.notificationId}
          room={room}
          summary={roomSummary}
        />
      ) : (
        target && (
          <>
            <div
              className={`ll:flex ll:flex-wrap ll:gap-1 ${hasDetails ? "ll:min-h-5 ll:items-start ll:mb-1" : "ll:min-h-6 ll:items-center"}`}
            >
              <span
                className={`ll:shrink-0 ll:whitespace-nowrap ll:text-[11px] ll:font-semibold ${hasDetails ? "ll:relative ll:-top-px" : ""}`}
              >
                {t("gatherings.title")}
              </span>
              <ChatGatheringCounters
                applicantCount={target.applicantCount}
                inPartyCount={target.inPartyCount}
              />
              {locked &&
                candidates[0]?.notificationId !== target.notificationId && (
                  <span>{t("gatherings.new")}</span>
                )}
              <div
                className={`ll:ml-auto ll:flex ll:shrink-0 ll:items-center ${hasDetails ? "ll:-mt-1" : ""}`}
              >
                {!hasDetails && joinButton}
                <ChatGatheringHideButton
                  pending={pending}
                  onHide={() => onHide(target)}
                />
              </div>
            </div>
            <ChatGatheringDetails
              {...target}
              action={hasDetails ? joinButton : undefined}
            />
          </>
        )
      )}
      {otherCandidates.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          className={`${CHAT_GATHERING_ACTION_CLASS} ll:self-start`}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {t("gatherings.others", { count: otherCandidates.length })}
        </Button>
      )}
      {expanded && (
        <ul className="ll:m-0 ll:max-h-32 ll:list-none ll:overflow-auto ll:p-0">
          {otherCandidates.map((candidate) => {
            const candidateHasDetails = hasChatGatheringDetails(candidate);
            const candidateJoinButton = (
              <ChatGatheringJoinButton
                pending={pending}
                disabled={stale || Boolean(room)}
                onClick={() => onApply(candidate)}
              />
            );
            return (
              <li
                key={candidate.notificationId}
                className="ll:flex ll:min-w-0 ll:flex-col ll:gap-0.5 ll:py-1"
              >
                <div
                  className={`ll:flex ll:flex-wrap ll:gap-1 ${candidateHasDetails ? "ll:min-h-5 ll:items-start ll:mb-1" : "ll:min-h-6 ll:items-center"}`}
                >
                  <span
                    className={`ll:shrink-0 ll:whitespace-nowrap ll:text-[11px] ll:font-semibold ${candidateHasDetails ? "ll:relative ll:-top-px" : ""}`}
                  >
                    {t("gatherings.title")}
                  </span>
                  <ChatGatheringCounters
                    applicantCount={candidate.applicantCount}
                    inPartyCount={candidate.inPartyCount}
                  />
                  <div
                    className={`ll:ml-auto ll:flex ll:shrink-0 ll:items-center ${candidateHasDetails ? "ll:-mt-1" : ""}`}
                  >
                    {!candidateHasDetails && candidateJoinButton}
                    <ChatGatheringHideButton
                      pending={pending}
                      onHide={() => onHide(candidate)}
                    />
                  </div>
                </div>
                <ChatGatheringDetails
                  {...candidate}
                  action={candidateHasDetails ? candidateJoinButton : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
