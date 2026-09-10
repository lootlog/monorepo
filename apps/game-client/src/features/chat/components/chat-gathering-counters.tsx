import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatGatheringCounters({
  partyMemberCount,
}: {
  partyMemberCount?: number;
}) {
  const { t } = useTranslation("chat");
  const label =
    partyMemberCount === undefined
      ? t("gatherings.partyMemberCountUnknown")
      : t("gatherings.partyMemberCount", { count: partyMemberCount });

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
            {t("gatherings.counts", {
              inParty: partyMemberCount ?? "—",
            })}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
