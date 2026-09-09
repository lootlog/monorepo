import {
  ChatGatheringDetails,
  hasChatGatheringDetails,
} from "./chat-gathering-details";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

type Props = {
  candidates: ActivePartyGatheringSummary[];
  target: ActivePartyGatheringSummary | null;
  locked: boolean;
  pending: boolean;
  stale: boolean;
  onApply: (candidate: ActivePartyGatheringSummary) => void;
  onShowLatest: () => void;
};

export function ChatAvailableGatherings({
  candidates,
  target,
  locked,
  pending,
  stale,
  onApply,
  onShowLatest,
}: Props) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState(false);
  if (!target)
    return candidates.length > 0 ? (
      <Button
        variant="ghost"
        className={CHAT_GATHERING_ACTION_CLASS}
        onClick={onShowLatest}
      >
        {t("gatherings.showLatest")}
      </Button>
    ) : null;
  return (
    <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-0.5">
      <div
        className={`ll:flex ll:flex-wrap ll:items-start ll:gap-1 ${hasChatGatheringDetails(target) ? "ll:mb-1" : ""}`}
      >
        <span className="ll:min-w-0 ll:flex-1 ll:relative ll:-top-px ll:text-[11px] ll:font-semibold">
          {t("gatherings.title")}
        </span>
        {locked && candidates[0]?.notificationId !== target.notificationId && (
          <span>{t("gatherings.new")}</span>
        )}
        <Button
          variant="ghost"
          className={CHAT_GATHERING_ACTION_CLASS}
          disabled={pending || stale}
          onClick={() => onApply(target)}
        >
          {t(pending ? "gatherings.applying" : "gatherings.apply")}
        </Button>
        {candidates.length > 1 && (
          <Button
            variant="ghost"
            className={CHAT_GATHERING_ACTION_CLASS}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {t("gatherings.others", { count: candidates.length - 1 })}
          </Button>
        )}
      </div>
      <ChatGatheringDetails {...target} />
      {expanded && (
        <ul className="ll:m-0 ll:max-h-32 ll:list-none ll:overflow-auto ll:p-0">
          {candidates
            .filter(
              (candidate) => candidate.notificationId !== target.notificationId,
            )
            .map((candidate) => (
              <li
                key={candidate.notificationId}
                className="ll:flex ll:flex-wrap ll:items-center ll:gap-1 ll:py-0.5"
              >
                <div className="ll:min-w-0 ll:flex-1">
                  <ChatGatheringDetails {...candidate} />
                </div>
                <Button
                  variant="ghost"
                  className={CHAT_GATHERING_ACTION_CLASS}
                  disabled={pending || stale}
                  onClick={() => onApply(candidate)}
                >
                  {t("gatherings.apply")}
                </Button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
