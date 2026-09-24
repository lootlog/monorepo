import type { TFunction } from "i18next";
import type { EventRanking } from "../../types/api";

export const getRankingMemberName = (ranking: EventRanking, t: TFunction) =>
  ranking.member?.name ??
  t("events.ranking.memberFallback", { memberId: ranking.memberId });
