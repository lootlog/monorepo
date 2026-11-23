import type { Battle } from "@/lib/api/battlelog-types";
import { upperFirst } from "es-toolkit";
import { Badge, badgeVariants } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
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
  "max-w-[92px] min-w-0 justify-center truncate";

const BATTLE_INFO_TAG_ACTION_CLASS_NAME =
  "pointer-events-auto cursor-pointer transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const handleFilterBadgeKeyDown = (
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  action();
};

export const BattleTableInfoBadges = ({
  battle,
  onMatchmakingClick,
  onPhClick,
  onWorldClick,
}: BattleTableInfoBadgesProps) => {
  const { t } = useTranslation();

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

  return (
    // oxlint-disable-next-line react-doctor/no-static-element-interactions -- This container only stops bubbling from its native child controls so the surrounding table row does not navigate; it is not a separate action.
    <div
      data-battle-table-action
      onClick={stopBattleTableAction}
      onKeyDown={stopBattleTableKeyboardAction}
      className="pointer-events-none relative flex max-w-[168px] flex-wrap items-center gap-1"
    >
      {onWorldClick ? (
        <button
          type="button"
          data-battle-table-action
          onClick={(event) => handleWorldBadgeClick(event, battle.world)}
          onKeyDown={stopBattleTableKeyboardAction}
          className={cn(
            badgeVariants({ variant: "outline", size: "sm" }),
            BATTLE_INFO_TAG_CLASS_NAME,
            BATTLE_INFO_TAG_ACTION_CLASS_NAME,
          )}
        >
          {upperFirst(battle.world)}
        </button>
      ) : (
        <Badge
          variant="outline"
          size="sm"
          className={BATTLE_INFO_TAG_CLASS_NAME}
        >
          {upperFirst(battle.world)}
        </Badge>
      )}
      {battle.public && (
        <Badge
          variant="tinted"
          size="sm"
          className={BATTLE_INFO_TAG_CLASS_NAME}
        >
          {t("battleUi.metadata.public")}
        </Badge>
      )}
      {userWarrior?.ph !== 0 && userWarrior?.ph !== undefined && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                {...(onPhClick && {
                  onClick: handlePhBadgeClick,
                  onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
                    handleFilterBadgeKeyDown(event, onPhClick),
                  role: "button",
                  tabIndex: 0,
                })}
                variant="outline"
                size="sm"
                className={cn(
                  BATTLE_INFO_TAG_CLASS_NAME,
                  onPhClick && BATTLE_INFO_TAG_ACTION_CLASS_NAME,
                )}
              >
                {t("battlePanel.bulk.honorPointsShort")}
              </Badge>
            }
          />
          <TooltipContent>
            {t("battlePanel.filters.honorPoints")}
          </TooltipContent>
        </Tooltip>
      )}
      {battle.matchmaking && (
        <Tooltip>
          <TooltipTrigger
            render={
              <Badge
                {...(onMatchmakingClick && {
                  onClick: handleMatchmakingBadgeClick,
                  onKeyDown: (event: KeyboardEvent<HTMLElement>) =>
                    handleFilterBadgeKeyDown(event, onMatchmakingClick),
                  role: "button",
                  tabIndex: 0,
                })}
                variant="live"
                size="sm"
                className={cn(
                  BATTLE_INFO_TAG_CLASS_NAME,
                  onMatchmakingClick && BATTLE_INFO_TAG_ACTION_CLASS_NAME,
                )}
              >
                {t("battlePanel.filters.matchmaking")}
              </Badge>
            }
          />
          <TooltipContent>
            {t("battlePanel.filters.matchmaking")}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
