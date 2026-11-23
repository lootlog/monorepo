import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { HeroSightingMemberDto } from "@lootlog/client/main";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HeroSightingMemberColors } from "@/features/hero-sightings/hooks/use-hero-sighting-member-colors";

export function HeroSightingRefresher({
  member,
  memberColors,
  children,
}: {
  member: HeroSightingMemberDto | null;
  memberColors: HeroSightingMemberColors;
  children: ReactNode;
}) {
  const { t } = useTranslation("heroSightings");

  if (!member) {
    return <span className="ll:shrink-0">{children}</span>;
  }

  const color = memberColors.get(member.memberId) ?? "FFF";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ll:inline-flex ll:shrink-0 ll:items-center ll:gap-0.5">
          <RefreshCw aria-hidden="true" className="ll:size-2.5 ll:shrink-0" />
          <span className="ll:sr-only">
            {t("refreshedBy", { name: member.displayName })}
          </span>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="ll:text-muted-foreground">
          {t("refreshedByLabel")}{" "}
        </span>
        <span className="ll:font-semibold" style={{ color: `#${color}` }}>
          {member.displayName}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}
