import { useQueries } from "@tanstack/react-query";
import { getGuildMembersSummaryQueryOptions } from "@/hooks/api/guild-members-summary-query";
import { getMemberColorHex } from "@/utils/member-color";

export type HeroSightingMemberColors = ReadonlyMap<number, string>;

export const useHeroSightingMemberColors = (
  guildIds: readonly string[],
): HeroSightingMemberColors => {
  const memberQueries = useQueries({
    queries: guildIds.map((guildId) =>
      getGuildMembersSummaryQueryOptions({ guildId }),
    ),
  });

  const colors = new Map<number, string>();

  for (const query of memberQueries) {
    for (const member of query.data ?? []) {
      colors.set(member.id, getMemberColorHex(member));
    }
  }

  return colors;
};
