import { TileChevron } from "@/components/common/tile-chevron";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { upperFirst } from "es-toolkit";
import { RelativeTime } from "@/components/common/relative-time";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  getListTileLinkClassName,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import type { BattlesListResponseDtoOutputBattlesItem } from "@lootlog/client/battlelog";
import {
  getBattleResult,
  getBattleTeams,
} from "@/features/user/battle-panel/components/battle-panel-battle-presentation";
import { BattleResultStatus } from "@/features/user/battle-panel/components/battle-result-status";

export function DashboardRecentBattle({
  battle,
  now,
  actions,
}: {
  battle: BattlesListResponseDtoOutputBattlesItem;
  now: number;
  actions: ReactNode;
}) {
  const { t } = useTranslation();
  const { rightTeam } = getBattleTeams(battle);

  const opponents = rightTeam
    .map(({ name, lvl }) => `${name} (${lvl})`)
    .join(", ");

  return (
    <li
      className={cn(
        "flex min-w-0 items-stretch",
        LIST_TILE_HOVER_CLASS,
        LIST_TILE_RULE_CLASS,
      )}
    >
      <Link
        to="/@me/battle-panel/battles/$battleId"
        params={{ battleId: battle.id }}
        className={cn(getListTileLinkClassName(true), "group/tile")}
      >
        <BattleResultStatus result={getBattleResult(battle)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={opponents}>
            {opponents || t("statistics.recentBattles.unknownOpponent")}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {upperFirst(battle.world)} ·{" "}
            <RelativeTime at={battle.createdAt} now={now} />
          </p>
        </div>
        <TileChevron />
      </Link>
      {actions}
    </li>
  );
}
