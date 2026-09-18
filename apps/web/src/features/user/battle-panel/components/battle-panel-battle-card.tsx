import type { Battle } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { getRelativeTime } from "@/utils/date/get-relative-time";
import { Badge } from "@lootlog/ui/components/badge";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { cn } from "cn";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getBattleResult,
  getBattleTeams,
} from "./battle-panel-battle-presentation";
import { BattlePanelTeamSummary } from "./battle-panel-team-summary";
import { BattleResultStatus } from "./battle-result-status";

type BattlePanelBattleCardProps = {
  actions?: ReactNode;
  battle: Battle;
  isChecked: boolean;
  onSelectionChange: (battleId: string, selected: boolean) => void;
};

export const BattlePanelBattleCard = ({
  actions,
  battle,
  isChecked,
  onSelectionChange,
}: BattlePanelBattleCardProps) => {
  const { t } = useTranslation();
  const { leftTeam, rightTeam, userWarrior } = getBattleTeams(battle);
  const result = getBattleResult(battle);
  const exactTime = format(new Date(battle.createdAt), "dd.MM.yyyy HH:mm");

  return (
    <article
      className={cn(
        "relative border-b border-border/70 p-3 transition-colors last:border-b-0 hover:bg-muted/30",
        isChecked && "bg-primary/10 ring-1 ring-inset ring-primary/45",
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={isChecked}
          aria-label={t("battlePanel.bulk.selectRow")}
          className="relative z-10 size-5 border-muted-foreground/70 data-checked:border-primary"
          onCheckedChange={(checked) =>
            onSelectionChange(battle.id, checked === true)
          }
        />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <BattleResultStatus result={result} showLabel />
          <Badge variant="outline" className="max-w-[96px] truncate">
            {capitalizeFirstLetter(battle.world)}
          </Badge>
          <div className="ml-auto flex shrink-0 flex-col items-end gap-0.5 leading-tight">
            <span className="text-xs font-medium">
              {getRelativeTime(battle.createdAt)}
            </span>
            <time
              dateTime={battle.createdAt}
              className="text-[11px] tabular-nums text-muted-foreground"
            >
              {exactTime}
            </time>
          </div>
        </div>
        {actions && <div className="relative z-10">{actions}</div>}
      </div>
      <Link
        to="/@me/battle-panel/battles/$battleId"
        params={{ battleId: battle.id }}
        preload={false}
        className="mt-3 block rounded-sm text-left outline-none after:absolute after:inset-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] text-muted-foreground">
              {t("battlePanel.list.columns.yourTeam")}
            </p>
            <BattlePanelTeamSummary
              team={leftTeam}
              userWarrior={userWarrior}
              maxVisibleWarriors={5}
            />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] text-muted-foreground">
              {t("battlePanel.list.columns.opponents")}
            </p>
            <BattlePanelTeamSummary team={rightTeam} maxVisibleWarriors={5} />
          </div>
        </div>
      </Link>
    </article>
  );
};
