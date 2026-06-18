import type { FC } from "react";
import type { Battle } from "@/lib/api/battlelog-types";
import { MARGONEM_CDN_CHARACTERS_URL } from "@/constants/margonem";
import { BattleOverviewCard } from "@/components/battle";

export type BattleOverviewProps = {
  battle: Battle;
  showHeader?: boolean;
};

export const BattleOverview: FC<BattleOverviewProps> = ({
  battle,
  showHeader = true,
}) => {
  return (
    <BattleOverviewCard
      battle={battle}
      cdnBaseUrl={MARGONEM_CDN_CHARACTERS_URL}
      showHeader={showHeader}
      showActions={false}
    />
  );
};
