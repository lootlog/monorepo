import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HeroSightingMemberDto } from "@lootlog/client/main";

/** Who confirmed the hero last, beside the time of that confirmation. */
export function HeroSightingRefresher({
  member,
}: {
  member: HeroSightingMemberDto;
}) {
  const { t } = useTranslation("heroSightings");

  return (
    <span className="ll:inline-flex ll:min-w-0 ll:items-center ll:gap-0.5">
      <RefreshCw aria-hidden="true" className="ll:size-2.5 ll:shrink-0" />
      <span className="ll:sr-only">
        {t("refreshedBy", { name: member.displayName })}
      </span>
      <span aria-hidden="true" className="ll:max-w-20 ll:truncate">
        {member.displayName}
      </span>
    </span>
  );
}
