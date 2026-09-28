import { useTranslation } from "react-i18next";
import type { PartyGatheringSummary } from "@lootlog/schema/party-ready-room";
import { useGatheringPartyState } from "@/components/common/use-gathering-party-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GatheringPartyCounter({
  partyState,
  stale,
}: {
  partyState?: PartyGatheringSummary["partyState"];
  stale?: boolean;
}) {
  const { t } = useTranslation("chat");
  const { observation, isStale } = useGatheringPartyState(partyState, stale);
  const partyMemberCount = observation?.members.length;

  let label = t("gatherings.partyMemberCountUnknown");

  if (partyMemberCount !== undefined) {
    label = t(
      isStale
        ? "gatherings.partyMemberCountStale"
        : "gatherings.partyMemberCount",
      {
        count: partyMemberCount,
      },
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          role="img"
          aria-label={label}
          className="ll:flex ll:min-h-[18px] ll:shrink-0 ll:items-center ll:whitespace-nowrap ll:text-[11px] ll:leading-[18px] ll:tabular-nums ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        >
          <span aria-hidden="true">
            {t(
              observation && isStale
                ? "gatherings.countsStale"
                : "gatherings.counts",
              {
                inParty: partyMemberCount ?? "—",
              },
            )}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
