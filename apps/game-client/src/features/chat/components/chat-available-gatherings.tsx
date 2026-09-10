import {
  ChatGatheringDetails,
  hasChatGatheringDetails,
} from "./chat-gathering-details";
import { ChatOwnGatheringBar } from "./chat-own-gathering-bar";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import { ChatGatheringHideButton } from "./chat-gathering-hide-button";
import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { useTranslation } from "react-i18next";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";

type Props = {
  candidates: ActivePartyGatheringSummary[];
  target: ActivePartyGatheringSummary | null;
  room: PartyReadyRoomProjection | null;
  roomSummary?: ActivePartyGatheringSummary;
  pending: boolean;
  stale: boolean;
  onApply: (candidate: ActivePartyGatheringSummary) => void;
  onHide: (candidate: ActivePartyGatheringSummary) => void;
};

export function ChatAvailableGatherings({
  candidates,
  target,
  room,
  roomSummary,
  pending,
  stale,
  onApply,
  onHide,
}: Props) {
  const { t } = useTranslation("chat");
  const availableCandidates = [
    ...(target && !room ? [target] : []),
    ...candidates.filter(
      (candidate) =>
        candidate.notificationId !== room?.notificationId &&
        (room || candidate.notificationId !== target?.notificationId),
    ),
  ];
  return (
    <ul className="ll:m-0 ll:flex ll:min-w-0 ll:max-h-64 ll:flex-col ll:gap-1 ll:list-none ll:overflow-auto ll:p-0">
      {room && (
        <li key={room.notificationId} className="ll:min-w-0 ll:py-1">
          <ChatOwnGatheringBar room={room} summary={roomSummary} />
        </li>
      )}
      {availableCandidates.map((candidate) => {
        const candidateHasDetails = hasChatGatheringDetails(candidate);
        const candidateJoinButton = (
          <ChatGatheringJoinButton
            pending={pending}
            disabled={stale || Boolean(room)}
            featured={
              !room && candidate.notificationId === target?.notificationId
            }
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
                className={`ll:min-w-0 ll:[overflow-wrap:anywhere] ll:text-[11px] ll:font-semibold ${candidateHasDetails ? "ll:relative ll:-top-px" : ""}`}
              >
                {t("gatherings.titleWithOrganizer", {
                  organizer: candidate.organizerName,
                })}
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
  );
}
