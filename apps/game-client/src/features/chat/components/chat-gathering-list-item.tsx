import { useTranslation } from "react-i18next";
import { UserPlus, LoaderCircle } from "lucide-react";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import { ChatGatheringHeader } from "./chat-gathering-header";
import { ChatGatheringCounters } from "./chat-gathering-counters";
import { ChatGatheringDetails } from "./chat-gathering-details";

export function ChatGatheringListItem({
  gathering,
  hidden,
  pending,
  disabled,
  onApply,
  onRestore,
}: {
  gathering: ActivePartyGatheringSummary;
  hidden: boolean;
  pending: boolean;
  disabled: boolean;
  onApply: () => void;
  onRestore: () => void;
}) {
  const { t } = useTranslation("chat");

  return (
    <li className="ll-party-gathering-card ll:min-w-0 ll:border-solid ll:border-x-0 ll:border-t-0 ll:border-b ll:border-gray-400/20 ll:p-2 ll:last:border-b-0">
      <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <div className="ll:min-w-0 ll:flex-1 ll:truncate">
          <ChatGatheringHeader
            organizerDiscordId={gathering.organizerDiscordId}
            guildIds={gathering.guildIds}
          />
        </div>
        <ChatGatheringCounters partyMemberCount={gathering.partyMemberCount} />
      </div>
      <ChatGatheringDetails {...gathering} />
      <div className="ll:mt-1 ll:flex ll:items-center ll:justify-between ll:gap-2">
        {hidden ? (
          <Button
            variant="ghost"
            className="ll:h-6 ll:border-0 ll:p-0 ll:text-[10px] ll:text-purple-200 ll:underline ll:underline-offset-2"
            aria-label={t("gatherings.restoreNamed", {
              name:
                gathering.npc?.name ??
                gathering.description ??
                gathering.organizerName,
            })}
            onClick={onRestore}
          >
            {t("gatherings.showInChat")}
          </Button>
        ) : (
          <span className="ll:text-[10px] ll:text-muted-foreground">
            {t("gatherings.visibleInChat")}
          </span>
        )}
        <Button
          variant="ghost"
          className="ll:h-6 ll:gap-1 ll:border ll:border-purple-400/40 ll:bg-purple-500/20 ll:px-1.5 ll:text-[11px]"
          disabled={disabled || pending}
          onClick={onApply}
        >
          {pending ? (
            <LoaderCircle size={14} aria-hidden />
          ) : (
            <UserPlus size={14} aria-hidden />
          )}
          {t("gatherings.apply")}
        </Button>
      </div>
    </li>
  );
}
