import { UserCheck, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ChatGatheringCounters({
  applicantCount,
  inPartyCount,
}: {
  applicantCount?: number;
  inPartyCount?: number;
}) {
  const { t } = useTranslation("chat");
  const counters = [
    {
      id: "applicants",
      Icon: Users,
      value: applicantCount,
      label:
        applicantCount === undefined
          ? t("gatherings.applicantCountUnknown")
          : t("gatherings.applicantCount", { count: applicantCount }),
    },
    {
      id: "inParty",
      Icon: UserCheck,
      value: inPartyCount,
      label:
        inPartyCount === undefined
          ? t("gatherings.inPartyCountUnknown")
          : t("gatherings.inPartyCount", { count: inPartyCount }),
    },
  ];

  return (
    <div className="ll:ml-1 ll:flex ll:shrink-0 ll:items-center ll:gap-1.5">
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
              <span aria-hidden="true">{value ?? "—"}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
