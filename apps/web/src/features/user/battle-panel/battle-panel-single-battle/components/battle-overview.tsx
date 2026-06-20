import type { FC } from "react";
import type { Battle } from "@/lib/api/battlelog-types";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { BattleCompactOverviewCard } from "@/components/battle/battle-compact-overview-card";

export type BattleOverviewProps = {
  battle: Battle;
};

export const BattleOverview: FC<BattleOverviewProps> = ({ battle }) => {
  return (
    <BattleCompactOverviewCard
      battle={battle}
      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
    />
  );
};
