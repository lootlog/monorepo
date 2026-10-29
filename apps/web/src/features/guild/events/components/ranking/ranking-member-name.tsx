import { InactiveMemberSuffix } from "@/components/common/inactive-member-suffix";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";
import { getMemberDisplayRole } from "@lootlog/domain/member-display-role";
import { cn } from "cn";
import { useTranslation } from "react-i18next";
import type { EventRanking } from "../../types/api";
import { getRankingMemberName } from "./get-ranking-member-name";

type RankingMemberNameProps = {
  ranking: EventRanking;
  className?: string;
  /** The member has left the Lootlog. */
  inactive?: boolean;
};

/** A ranked member's name in their role's colour. */
export const RankingMemberName = ({
  ranking,
  className,
  inactive = false,
}: RankingMemberNameProps) => {
  const { t } = useTranslation();

  const roleCssColor = getCustomRoleCssColor(
    getMemberDisplayRole(ranking.member?.roles)?.color,
  );

  return (
    <span
      className={cn("block min-w-0 truncate font-semibold", className)}
      style={roleCssColor ? { color: roleCssColor } : undefined}
    >
      {getRankingMemberName(ranking, t)}
      {inactive && <InactiveMemberSuffix />}
    </span>
  );
};
