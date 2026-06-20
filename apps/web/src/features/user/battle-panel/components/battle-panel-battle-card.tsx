import { PlayerTile } from "@/components/battle";
import type { Battle, BattleWarrior } from "@/lib/api/battlelog-types";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { cn } from "@lootlog/ui/lib/utils";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getBattleResult,
  getBattleTeams,
} from "./battle-panel-battle-presentation";
import { BattleResultStatus } from "./battle-result-status";

type BattlePanelBattleCardProps = {
  actions?: ReactNode;
  battle: Battle;
  isChecked: boolean;
  onBattleClick: (battleId: string) => void;
  onSelectionChange: (battleId: string, selected: boolean) => void;
};

const renderTeam = (team: BattleWarrior[], userWarrior?: BattleWarrior) => {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {team.map((warrior) => (
        <div key={warrior.id} className="flex min-w-0 items-center gap-2">
          <PlayerTile player={warrior} className="origin-center scale-75" />
          <div className="min-w-0 leading-tight">
            <p
              className={cn(
                "truncate text-xs font-medium",
                warrior.originalId === userWarrior?.originalId &&
                  "text-green-500",
              )}
            >
              {warrior.name}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {warrior.lvl}
              {warrior.prof}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export const BattlePanelBattleCard = ({
  actions,
  battle,
  isChecked,
  onBattleClick,
  onSelectionChange,
}: BattlePanelBattleCardProps) => {
  const { t } = useTranslation();
  const { leftTeam, rightTeam, userWarrior } = getBattleTeams(battle);
  const result = getBattleResult(battle);
  const exactTime = format(new Date(battle.createdAt), "dd.MM.yyyy HH:mm");

  return (
    <article
      className={cn(
        "rounded-lg border border-border bg-background/35 p-3 transition-colors hover:bg-muted/30",
        isChecked && "border-primary/45 bg-primary/10",
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isChecked}
          aria-label={t("battlePanel.bulk.selectRow")}
          className="mt-1 size-5"
          onCheckedChange={(checked) =>
            onSelectionChange(battle.id, checked === true)
          }
        />
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onBattleClick(battle.id)}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <BattleResultStatus result={result} showLabel />
              <Badge variant="outline" className="max-w-[96px] truncate">
                {battle.world}
              </Badge>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {getRelativeTime(battle.createdAt)}
            </span>
          </div>
          <div className="mt-3 grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[11px] text-muted-foreground">
                {t("battlePanel.list.columns.yourTeam")}
              </p>
              {renderTeam(leftTeam, userWarrior)}
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] text-muted-foreground">
                {t("battlePanel.list.columns.opponents")}
              </p>
              {renderTeam(rightTeam)}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{exactTime}</p>
        </button>
        {actions}
      </div>
    </article>
  );
};
