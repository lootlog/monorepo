import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatDistance } from "date-fns";
import { pl } from "date-fns/locale";
import { useTranslation } from "react-i18next";
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
    <li className="group flex min-w-0 items-stretch border-b border-border last:border-b-0 hover:bg-muted/40 focus-within:bg-muted/40">
      <Link
        to="/@me/battle-panel/battles/$battleId"
        params={{ battleId: battle.id }}
        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <BattleResultStatus result={getBattleResult(battle)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" title={opponents}>
            {opponents || t("statistics.recentBattles.unknownOpponent")}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {battle.world} ·{" "}
            <time
              dateTime={battle.createdAt}
              title={new Date(battle.createdAt).toLocaleString("pl-PL")}
            >
              {formatDistance(new Date(battle.createdAt), now, {
                locale: pl,
                addSuffix: true,
              })}
            </time>
          </p>
        </div>
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </Link>
      {actions}
    </li>
  );
}
