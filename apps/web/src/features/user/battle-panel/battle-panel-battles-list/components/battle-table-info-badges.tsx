import type { Battle } from "@/lib/api/battlelog-types";
import { capitalizeFirstLetter } from "@/utils/capitalize-first-letter";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import type { KeyboardEvent, MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  stopBattleTableAction,
  stopBattleTableKeyboardAction,
} from "./battle-table-events";

type BattleTableInfoBadgesProps = {
  battle: Battle;
  onMatchmakingClick?: () => void;
  onPhClick?: () => void;
  onWorldClick?: (world: string) => void;
};

const BATTLE_INFO_TAG_CLASS_NAME =
  "inline-flex h-[17px] max-w-[92px] min-w-0 items-center justify-center truncate rounded-md border border-foreground/30 bg-background px-2 py-0 text-[10px] font-semibold leading-none text-muted-foreground";

const BATTLE_INFO_TAG_ACTION_CLASS_NAME =
  "cursor-pointer transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export const BattleTableInfoBadges = ({
  battle,
  onMatchmakingClick,
  onPhClick,
  onWorldClick,
}: BattleTableInfoBadgesProps) => {
  const { t } = useTranslation();
  const visibilityLabel = battle.public
    ? t("battleUi.metadata.public")
    : t("battleUi.metadata.private");
  const userWarrior = battle.warriors.find(
    (warrior) => warrior.originalId === battle.characterId,
  );

  const handleWorldBadgeClick = (
    event: MouseEvent<HTMLElement>,
    world: string,
  ) => {
    event.stopPropagation();
    onWorldClick?.(world);
  };

  const handlePhBadgeClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onPhClick?.();
  };

  const handleMatchmakingBadgeClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    onMatchmakingClick?.();
  };

  const handleFilterBadgeKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void,
  ) => {
    if (event.key !== "Enter" && event.key !== "") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <div
      data-battle-table-action
      onClick={stopBattleTableAction}
      onKeyDown={stopBattleTableKeyboardAction}
      className="flex max-w-[168px] flex-wrap items-center gap-1"
    >
      <button
        type="button"
        data-battle-table-action
        onClick={(event) => handleWorldBadgeClick(event, battle.world)}
        onKeyDown={stopBattleTableKeyboardAction}
        className={cn(
          BATTLE_INFO_TAG_CLASS_NAME,
          BATTLE_INFO_TAG_ACTION_CLASS_NAME,
        )}
      >
        {capitalizeFirstLetter(battle.world)}
      </button>
      <span className={BATTLE_INFO_TAG_CLASS_NAME}>{visibilityLabel}</span>
      {userWarrior?.ph !== 0 && userWarrior?.ph !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              onClick={handlePhBadgeClick}
              onKeyDown={(event) =>
                handleFilterBadgeKeyDown(event, () => onPhClick?.())
              }
              role="button"
              tabIndex={0}
              variant="outline"
              className={cn(
                BATTLE_INFO_TAG_CLASS_NAME,
                BATTLE_INFO_TAG_ACTION_CLASS_NAME,
              )}
            >
              {t("battlePanel.bulk.honorPointsShort")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t("battlePanel.filters.honorPoints")}
          </TooltipContent>
        </Tooltip>
      )}
      {battle.matchmaking && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              onClick={handleMatchmakingBadgeClick}
              onKeyDown={(event) =>
                handleFilterBadgeKeyDown(event, () => onMatchmakingClick?.())
              }
              role="button"
              tabIndex={0}
              variant="outline"
              className={cn(
                BATTLE_INFO_TAG_CLASS_NAME,
                BATTLE_INFO_TAG_ACTION_CLASS_NAME,
                "border-purple-500/50 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
              )}
            >
              {t("battlePanel.filters.matchmaking")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {t("battlePanel.filters.matchmaking")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
