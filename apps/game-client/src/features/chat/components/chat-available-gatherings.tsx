import { ChatGatheringJoinButton } from "./chat-gathering-join-button";
import { ChatGatheringCardView } from "./chat-gathering-card-view";
import { ChatOwnGatheringBar } from "./chat-own-gathering-bar";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import { ChatGatheringHideButton } from "./chat-gathering-hide-button";
import { UserPlus, LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";

type Props = {
  candidates: ActivePartyGatheringSummary[];
  target: ActivePartyGatheringSummary | null;
  room: PartyReadyRoomProjection | null;
  roomSummary?: ActivePartyGatheringSummary;
  pending: boolean;
  stale: boolean;
  hasOwnGathering?: boolean;
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
  hasOwnGathering = false,
  onApply,
  onHide,
}: Props) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState(false);

  const availableCandidates = [
    ...(target && !room ? [target] : []),
    ...candidates.filter(
      (candidate) =>
        candidate.notificationId !== room?.notificationId &&
        (room || candidate.notificationId !== target?.notificationId),
    ),
  ];

  const visibleCandidateCount = room?.viewer === "PARTICIPANT" ? 0 : 1;

  const remainingCount = Math.max(
    0,
    availableCandidates.length - visibleCandidateCount,
  );

  const currentRoom = room && (
    <li
      key={room.notificationId}
      className="ll:min-w-0 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:first:border-t-0"
    >
      <div className={room.viewer === "ORGANIZER" ? "ll:px-1.5 ll:py-0.5" : ""}>
        <ChatOwnGatheringBar room={room} summary={roomSummary} />
      </div>
    </li>
  );

  return (
    <ul
      className="ll:m-0 ll:flex ll:min-w-0 ll:max-h-64 ll:flex-col ll:list-none ll:overflow-auto ll:p-0"
      data-organizer={room?.viewer === "ORGANIZER"}
    >
      {room?.viewer !== "ORGANIZER" && currentRoom}
      {(expanded
        ? availableCandidates
        : availableCandidates.slice(0, visibleCandidateCount)
      ).map((candidate) => {
        const candidateJoinButton = (
          <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1">
            {pending ? (
              <LoaderCircle size={16} aria-hidden className="ll:animate-spin" />
            ) : (
              <UserPlus size={16} aria-hidden />
            )}
          </div>
        );

        return (
          <li
            key={candidate.notificationId}
            className="ll:min-w-0 ll:border-t ll:border-x-0 ll:border-b-0 ll:border-gray-400/40 ll:first:border-t-0"
          >
            <ChatGatheringCardView
              organizerDiscordId={candidate.organizerDiscordId}
              guildIds={candidate.guildIds}
              counters=<ChatGatheringCounters
                partyMemberCount={candidate.partyMemberCount}
              />
              details={{ ...candidate, action: candidateJoinButton }}
              menu=<ChatGatheringHideButton
                pending={pending}
                onHide={() => onHide(candidate)}
              />
              control=<ChatGatheringJoinButton
                pending={pending}
                disabled={stale || Boolean(room) || hasOwnGathering}
                featured={
                  !room && candidate.notificationId === target?.notificationId
                }
                onClick={() => onApply(candidate)}
              />
            />
          </li>
        );
      })}
      {remainingCount > 0 && (
        <li>
          <Button
            type="button"
            variant="ghost"
            className="ll:w-full ll:h-7 ll:gap-1 ll:rounded-none ll:border-0 ll:border-t ll:border-gray-400/20 ll:text-[10px]"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp size={12} aria-hidden />
            ) : (
              <ChevronDown size={12} aria-hidden />
            )}
            {expanded
              ? t("gatherings.collapse")
              : t("gatherings.more", { count: remainingCount })}
          </Button>
        </li>
      )}
      {room?.viewer === "ORGANIZER" && currentRoom}
    </ul>
  );
}
